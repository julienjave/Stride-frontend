/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { daysBetween, formatDayMonth } from '@/common/calendarDate'
import { cn } from '@/lib/utils'
import {
  dateTicks,
  dayCount,
  dayPositions,
  lineRuns,
  nearestIndex,
  wasAsked,
  type ChartRange,
  type ScoreKey,
  type ScoredSession,
} from './scoreRules'
import { SCORE_LABEL, scoreValueText, sessionLineText } from './scoreText'
import { useElementWidth } from './useElementWidth'

// ONE SCORE CHART, hand-drawn in SVG (the person's choice, 2026-10-18: no
// chart package). React computes every coordinate from the rules
// (scoreRules.ts); the SVG elements are just where they land:
//   - a 0–10 scale, 0 at the bottom (the scale's own direction — pain is
//     never drawn upside down; the sentence under the heading says which
//     end is good);
//   - a DATED time axis, one band per day (dayPositions);
//   - a 2 px line per series, broken where a session didn't answer
//     (lineRuns), with a dot per answer — filled for a completed session,
//     HOLLOW for one that wasn't (stopped, skipped for pain, in progress);
//   - a CROSSHAIR: hover, tap or the arrow keys pick the nearest session,
//     and the readout UNDER the chart names it and lists every series'
//     value. Under, not floating beside the point: on a phone the finger
//     covers whatever is beside it.
// The picture itself is hidden from screen readers (aria-hidden) — they
// get the summary sentence (the group's description), the readout (a live
// region), and the table under both charts (ScoresTable).

// The design's fixed sizes (the dataviz reference): 2 px lines, 8 px dots
// with a 2 px ring in the page's colour, hairline grid.
const PLOT_HEIGHT = 140
const MARGIN = { top: 10, right: 64, bottom: 26, left: 26 }
const DOT_RADIUS = 4
const FALLBACK_WIDTH = 320

// Each series' colour, as Tailwind classes written out in FULL: Tailwind
// finds the classes a page uses by reading the source, so a class built at
// run time (`stroke-${name}`) would never be generated. The colours are
// tokens in index.css (--score-pain-before …), each with a light and a dark
// step, validated with the dataviz palette checker (contrast against the
// page, and before / after told apart under colour blindness).
const SERIES_STYLE: Record<ScoreKey, { stroke: string; fill: string; key: string }> = {
  painBefore: {
    stroke: 'stroke-score-pain-before',
    fill: 'fill-score-pain-before',
    key: 'bg-score-pain-before',
  },
  painAfter: {
    stroke: 'stroke-score-pain-after',
    fill: 'fill-score-pain-after',
    key: 'bg-score-pain-after',
  },
  mobilityAfter: {
    stroke: 'stroke-score-mobility',
    fill: 'fill-score-mobility',
    key: 'bg-score-mobility',
  },
}

export interface ScoreChartProps<T extends ScoredSession> {
  // The chart's name for assistive technology ("Pain chart").
  label: string
  // The summary sentence's element id (painSummaryText, shown by the
  // section): the group's description.
  describedBy: string
  // The sessions this chart steps through: asked at least one of its
  // questions, in the range, OLDEST FIRST (askedSessions + inRange).
  sessions: readonly T[]
  keys: readonly ScoreKey[]
  range: ChartRange
  // "A · Mobility" for a session's workout, or null with one workout.
  workoutOf: (workoutId: number) => string | null
  // The readout's sentence before anything is picked.
  hint: string
}

export function ScoreChart<T extends ScoredSession>({
  label,
  describedBy,
  sessions,
  keys,
  range,
  workoutOf,
  hint,
}: ScoreChartProps<T>) {
  const frameRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(frameRef, FALLBACK_WIDTH)
  // The picked session, by ID rather than by index: when the list changes
  // (a refetch, "show all"), an index would silently point at another
  // session; an id that's gone just means nothing is picked.
  const [pickedId, setPickedId] = useState<number | null>(null)
  const readoutId = useId()

  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const days = dayCount(range)
  const positions = dayPositions(sessions, range.from)
  const xs = sessions.map((s) => positions.get(s.id) ?? 0)
  // Days → pixels, and a score → pixels (0 at the bottom: SVG's y grows
  // DOWNWARDS, hence `1 - value / 10`).
  const xOf = (day: number) => MARGIN.left + (day / days) * plotWidth
  const yOf = (value: number) => MARGIN.top + (1 - value / 10) * PLOT_HEIGHT
  const height = MARGIN.top + PLOT_HEIGHT + MARGIN.bottom

  const pickedIndex = sessions.findIndex((s) => s.id === pickedId)
  const picked = pickedIndex === -1 ? null : sessions[pickedIndex]

  // The pointer's x on the plot → the nearest session. One handler for a
  // mouse moving and a finger touching (Pointer Events cover both).
  // `getBoundingClientRect` gives the SVG's place on screen; the pointer's
  // `clientX` minus its left edge is the x inside it.
  function pickAt(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
    const x = event.clientX - (box?.left ?? 0)
    const index = nearestIndex(xs, ((x - MARGIN.left) / plotWidth) * days)
    if (index !== -1) setPickedId(sessions[index].id)
  }

  // The keyboard's crosshair: the same readout as hovering (the dataviz
  // rule "same details on keyboard focus as on hover"). Left / Right step
  // through the sessions; Home / End jump; Escape lets go. The first press
  // picks the LATEST session — what a reader looks for first. Handled keys
  // don't scroll the page (preventDefault).
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (sessions.length === 0) return
    const last = sessions.length - 1
    let next: number | null
    switch (event.key) {
      case 'ArrowLeft':
        next = pickedIndex === -1 ? last : Math.max(pickedIndex - 1, 0)
        break
      case 'ArrowRight':
        next = pickedIndex === -1 ? last : Math.min(pickedIndex + 1, last)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = last
        break
      case 'Escape':
        next = null
        break
      default:
        return
    }
    event.preventDefault()
    setPickedId(next === null ? null : sessions[next].id)
  }

  const ticks = dateTicks(range, width < 480 ? 4 : 6)
  const series = keys.map((key) => ({ key, runs: lineRuns(sessions, key, positions) }))
  // End labels ("After 2") beside each line's LAST point — but only when
  // they can't collide: two latest values closer than ~14 px would print
  // on top of each other, and nudging them apart would detach them from
  // their lines (the dataviz rule). The legend and the summary say it then.
  const ends = series.flatMap(({ key, runs }) => {
    const point = runs.at(-1)?.at(-1)
    return point ? [{ key, point }] : []
  })
  const endsFit =
    ends.length < 2 ||
    ends.every((a, i) => ends.slice(i + 1).every((b) => Math.abs(yOf(a.point.value) - yOf(b.point.value)) >= 14))

  return (
    <div className="space-y-2">
      <div
        ref={frameRef}
        role="group"
        aria-label={label}
        aria-describedby={`${describedBy} ${readoutId}`}
        aria-keyshortcuts="ArrowLeft ArrowRight Home End Escape"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <svg aria-hidden="true" width={width} height={height} className="block overflow-visible">
          {/* The scale: hairlines at 0, 5 and 10, numbered on the left. */}
          {[0, 5, 10].map((value) => (
            <g key={value}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + plotWidth}
                y1={yOf(value)}
                y2={yOf(value)}
                strokeWidth={1}
                className="stroke-border"
              />
              <text
                x={MARGIN.left - 6}
                y={yOf(value) + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {value}
              </text>
            </g>
          ))}

          {/* The dates, under the middle of their day — the first and
              last anchored inwards so they never run off the edge. */}
          {ticks.map((date, i) => {
            const edge = ticks.length > 1 && (i === 0 || i === ticks.length - 1)
            return (
              <text
                key={date}
                data-tick={date}
                x={xOf(daysBetween(range.from, date) + 0.5)}
                y={MARGIN.top + PLOT_HEIGHT + 18}
                textAnchor={edge ? (i === 0 ? 'start' : 'end') : 'middle'}
                className="fill-muted-foreground text-[11px]"
              >
                {formatDayMonth(date)}
              </text>
            )
          })}

          {/* The crosshair, behind the marks. */}
          {picked && (
            <line
              data-crosshair=""
              x1={xOf(xs[pickedIndex])}
              x2={xOf(xs[pickedIndex])}
              y1={MARGIN.top}
              y2={MARGIN.top + PLOT_HEIGHT}
              strokeWidth={1}
              className="stroke-muted-foreground"
            />
          )}

          {series.map(({ key, runs }) => (
            <g key={key} data-series={key}>
              {runs
                .filter((run) => run.length > 1)
                .map((run) => (
                  <polyline
                    key={run[0].session.id}
                    data-run={run.map((p) => p.session.id).join(' ')}
                    points={run.map((p) => `${xOf(p.x)},${yOf(p.value)}`).join(' ')}
                    fill="none"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    className={SERIES_STYLE[key].stroke}
                  />
                ))}
              {runs.flat().map((point) => {
                const hollow = point.session.status !== 'completed'
                return (
                  <circle
                    key={point.session.id}
                    data-session={point.session.id}
                    data-hollow={hollow ? '' : undefined}
                    cx={xOf(point.x)}
                    cy={yOf(point.value)}
                    r={point.session.id === pickedId ? DOT_RADIUS + 1 : DOT_RADIUS}
                    strokeWidth={2}
                    // Filled: the series' colour with a ring in the page's
                    // colour (keeps a dot readable where it crosses the
                    // other line). Hollow: the page's colour inside, the
                    // series' colour round it.
                    className={
                      hollow
                        ? cn('fill-background', SERIES_STYLE[key].stroke)
                        : cn(SERIES_STYLE[key].fill, 'stroke-background')
                    }
                  />
                )
              })}
            </g>
          ))}

          {endsFit &&
            ends.map(({ key, point }) => (
              <text
                key={key}
                data-end-label={key}
                x={xOf(point.x) + 8}
                y={yOf(point.value) + 4}
                className="fill-foreground text-[11px]"
              >
                {`${SCORE_LABEL[key]} ${point.value}`}
              </text>
            ))}

          {/* The pointer's target: the whole plot, transparent and on top —
              much bigger than an 8 px dot (the dataviz rule: aim at a date,
              never at a 2 px line). A mouse leaving lets go; a finger
              lifting doesn't — on a phone the readout stays for reading. */}
          <rect
            data-plot=""
            x={MARGIN.left}
            y={0}
            width={plotWidth}
            height={MARGIN.top + PLOT_HEIGHT}
            fill="transparent"
            onPointerMove={pickAt}
            onPointerDown={pickAt}
            onPointerLeave={(event) => {
              if (event.pointerType === 'mouse') setPickedId(null)
            }}
          />
        </svg>
      </div>

      {/* The readout: under the chart, always in the same place (no layout
          jump), and a live region — a screen reader using the arrow keys
          hears each session as it is picked. */}
      <div id={readoutId} aria-live="polite" className="min-h-10 text-sm">
        {picked ? (
          <>
            <p className="text-muted-foreground">
              {sessionLineText(picked, workoutOf(picked.workoutId))}
            </p>
            <ul className="flex flex-wrap gap-x-4">
              {keys.map((key) => (
                <li key={key} className="flex items-center gap-1.5">
                  <SeriesKey scoreKey={key} />
                  <span className="font-semibold tabular-nums">
                    {scoreValueText(picked[key], wasAsked(picked, key))}
                  </span>
                  {keys.length > 1 && <span className="text-muted-foreground">{SCORE_LABEL[key]}</span>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  )
}

// A short stroke of a series' colour: the key beside a value or a legend
// entry (a line chart's key is a line, not a box).
export function SeriesKey({ scoreKey }: { scoreKey: ScoreKey }) {
  return <span aria-hidden="true" className={cn('inline-block h-0.5 w-3 rounded-full', SERIES_STYLE[scoreKey].key)} />
}