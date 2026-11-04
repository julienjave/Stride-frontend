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

import { useRef } from 'react'
import { daysBetween, formatDayMonth } from '@/common/calendarDate'
import { cn } from '@/lib/utils'
import { dateTicks } from '@/progress/scoreRules'
import { useElementWidth } from '@/progress/useElementWidth'
import { cardRange, degreeScale, pointPositions, type MovementCard } from './romRules'
import { degreesText } from './romText'
import type { RomSide } from './types'

// A MOVEMENT CARD'S CHART, hand-drawn in SVG like the progress charts (the
// person's choice, 2026-10-18: no chart package — progress/ScoreChart.tsx is
// the model). React computes every coordinate; the SVG elements are just
// where they land:
//   - a DATED axis (one band per calendar day, by `measuredOn`): three visits
//     a fortnight apart look a fortnight apart;
//   - one 2 px line per side, with a marker per value — left ROUND, right
//     SQUARE: the two colours are told apart under colour blindness (checked
//     with the dataviz validator), and the shapes say it again for anyone
//     the colours don't reach;
//   - a dashed line at the typical value — the textbook guide;
//   - the latest value at each line's end ("R 126°"), when two can't collide.
//
// SMALL and STATIC on purpose (decisions §36: "a small hand-drawn chart"):
// a card holds a few values, and every one of them is in the card's text
// and its table — so there is no crosshair to step through. The picture is
// hidden from screen readers (aria-hidden); they read the card's sentences
// and the table twin (RomValuesTable), which say everything it shows.

const PLOT_HEIGHT = 96
const MARGIN = { top: 8, right: 52, bottom: 24, left: 34 }
const MARKER = 4
const FALLBACK_WIDTH = 320

// Each side's colour, as Tailwind classes written out in FULL (Tailwind
// finds classes by reading the source — `stroke-rom-${side}` would never be
// generated). An unsided movement has one line: the text colour, as a
// single series needs no colour to tell it from anything.
const SIDE_STYLE: Record<RomSide | 'none', { stroke: string; fill: string }> = {
  left: { stroke: 'stroke-rom-left', fill: 'fill-rom-left' },
  right: { stroke: 'stroke-rom-right', fill: 'fill-rom-right' },
  none: { stroke: 'stroke-foreground', fill: 'fill-foreground' },
}

const END_PREFIX: Record<RomSide | 'none', string> = { left: 'L ', right: 'R ', none: '' }

export function RomChart({ card }: { card: MovementCard }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const width = useElementWidth(frameRef, FALLBACK_WIDTH)

  const range = cardRange(card)
  const days = daysBetween(range.from, range.to) + 1
  const { low, high } = degreeScale(card)
  const plotWidth = Math.max(width - MARGIN.left - MARGIN.right, 1)
  const height = MARGIN.top + PLOT_HEIGHT + MARGIN.bottom
  // Days → pixels; degrees → pixels (SVG's y grows DOWNWARDS, hence 1 − …).
  const xOf = (day: number) => MARGIN.left + (day / days) * plotWidth
  const yOf = (degrees: number) => MARGIN.top + (1 - (degrees - low) / (high - low)) * PLOT_HEIGHT

  const lines = card.series.map((series) => {
    const positions = pointPositions(series.points, range.from)
    const key: RomSide | 'none' = series.side ?? 'none'
    const points = series.points.map((point) => ({
      id: point.assessmentId,
      x: xOf(positions.get(point.assessmentId) ?? 0),
      y: yOf(point.degrees),
      degrees: point.degrees,
    }))
    return { key, points }
  })
  // The end labels only when they can't print on top of each other (two
  // latest values closer than 14 px): nudging them apart would detach them
  // from their lines (the dataviz rule) — the card's text says them anyway.
  const ends = lines.flatMap((line) => {
    const last = line.points.at(-1)
    return last ? [{ key: line.key, last }] : []
  })
  const endsFit = ends.length < 2 || Math.abs(ends[0].last.y - ends[1].last.y) >= 14
  // The scale's labels: its two ends, and 0 when it lies between (a
  // negative value is drawn below the "straight" line) — unless 0 is closer
  // than 14 px to an end, where the two labels would print on each other.
  const zeroFits = low < 0 && high > 0 && yOf(low) - yOf(0) >= 14 && yOf(0) - yOf(high) >= 14
  const scale = zeroFits ? [low, 0, high] : [low, high]
  const ticks = dateTicks(range, width < 400 ? 3 : 5)
  const typicalY = yOf(card.movement.typicalDegrees)

  return (
    <div ref={frameRef}>
      <svg aria-hidden="true" width={width} height={height} className="block overflow-visible">
        {scale.map((value) => (
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
              {degreesText(value)}
            </text>
          </g>
        ))}

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

        {/* The typical value: dashed, the muted ink — a reference, not data. */}
        <line
          data-typical={card.movement.typicalDegrees}
          x1={MARGIN.left}
          x2={MARGIN.left + plotWidth}
          y1={typicalY}
          y2={typicalY}
          strokeWidth={1}
          strokeDasharray="4 3"
          className="stroke-muted-foreground"
        />

        {lines.map((line) => (
          <g key={line.key} data-side={line.key}>
            {line.points.length > 1 && (
              <polyline
                points={line.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={SIDE_STYLE[line.key].stroke}
              />
            )}
            {line.points.map((point) =>
              // A 2 px ring in the page's colour round each marker keeps it
              // readable where it sits on the other line.
              line.key === 'right' ? (
                <rect
                  key={point.id}
                  data-point={point.degrees}
                  x={point.x - MARKER}
                  y={point.y - MARKER}
                  width={MARKER * 2}
                  height={MARKER * 2}
                  rx={1}
                  strokeWidth={2}
                  className={cn(SIDE_STYLE[line.key].fill, 'stroke-background')}
                />
              ) : (
                <circle
                  key={point.id}
                  data-point={point.degrees}
                  cx={point.x}
                  cy={point.y}
                  r={MARKER}
                  strokeWidth={2}
                  className={cn(SIDE_STYLE[line.key].fill, 'stroke-background')}
                />
              ),
            )}
          </g>
        ))}

        {endsFit &&
          ends.map(({ key, last }) => (
            <text
              key={key}
              data-end-label={key}
              x={last.x + 8}
              y={last.y + 4}
              className="fill-foreground text-[11px] tabular-nums"
            >
              {`${END_PREFIX[key]}${degreesText(last.degrees)}`}
            </text>
          ))}
      </svg>
    </div>
  )
}

// The chart's key: a marker per side in its colour and shape, and the dashed
// typical line — words in the text colour, the colour on the mark only (the
// dataviz rule). Shown for every card: even an unsided one has the typical
// line to explain. Hidden from screen readers like the chart it explains.
export function RomChartKey({ sides }: { sides: readonly (RomSide | null)[] }) {
  return (
    <ul aria-hidden="true" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {/* Only the sides this card has: a passive knee measured on the right
          alone has no "Left" to explain. */}
      {sides.includes('left') && (
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-rom-left" />
          Left
        </li>
      )}
      {sides.includes('right') && (
        <li className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-[1px] bg-rom-right" />
          Right
        </li>
      )}
      <li className="flex items-center gap-1.5">
        <span className="inline-block w-3 border-t border-dashed border-muted-foreground" />
        Typical
      </li>
    </ul>
  )
}