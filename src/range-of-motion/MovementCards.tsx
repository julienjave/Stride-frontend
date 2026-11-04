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

import { useId } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatDayMonth, formatShortDate } from '@/common/calendarDate'
import type { Audience } from '@/medical-files/medicalFileText'
import { RomChart, RomChartKey } from './RomChart'
import { changeSinceFirst, type MovementCard, type RomSeries } from './romRules'
import { SIDE_LABELS, cardTitle, changeText, degreesText, typicalText } from './romText'

// The record's movements, a CARD per movement and mode (decisions §36): the
// latest value of each side with its day, the change since the first value,
// the typical value, the small chart, and its table twin. The same cards for
// the practitioner and for the patient (read-only either way — writing is the
// assessments' business); `audience` changes how the typical value is worded.
//
// Each card's heading is an h3: on both pages the cards sit in a section
// headed by an h2 ("Movements", "Range of motion").
export function MovementCards({ cards, audience }: { cards: MovementCard[]; audience: Audience }) {
  return (
    <ul aria-label="Movements" className="space-y-4">
      {cards.map((card) => (
        <li key={`${card.movement.movement}|${card.mode}`}>
          <Card card={card} audience={audience} />
        </li>
      ))}
    </ul>
  )
}

function Card({ card, audience }: { card: MovementCard; audience: Audience }) {
  const id = useId()
  const typical = typicalText(card.movement.typicalDegrees, audience)
  return (
    <article aria-labelledby={`${id}-heading`} className="space-y-3 rounded-lg border p-4">
      <h3 id={`${id}-heading`} className="text-base font-semibold">
        {cardTitle(card.movement.name, card.mode)}
      </h3>
      <dl className="space-y-1 text-sm">
        {card.series.map((series) => (
          <LatestValue key={series.side ?? 'none'} series={series} />
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">{typical}</p>
      <div className="space-y-1">
        <RomChartKey sides={card.series.map((series) => series.side)} />
        <RomChart card={card} />
      </div>
      <RomValuesTable card={card} />
    </article>
  )
}

// "Right  126° · 27 Oct  ↑ 16° since 10 Oct" — one side's latest value.
function LatestValue({ series }: { series: RomSeries }) {
  const last = series.points[series.points.length - 1]
  const change = changeSinceFirst(series)
  const words = change && changeText(change.degrees, change.since)
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <dt className="w-12 shrink-0 text-muted-foreground">{series.side ? SIDE_LABELS[series.side] : 'Latest'}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold tabular-nums">{degreesText(last.degrees)}</span>
        <span className="text-muted-foreground">{formatDayMonth(last.measuredOn)}</span>
        {words && (
          <span>
            <span aria-hidden="true">{words.shown}</span>
            <span className="sr-only">{words.spoken}</span>
          </span>
        )}
      </dd>
    </div>
  )
}

// The chart's TABLE twin (the dataviz rule: every chart has one): each day
// measured, newest first, a column per side — every value as text. Folded
// by default, a native <details> (the progress page's ScoresTable).
function RomValuesTable({ card }: { card: MovementCard }) {
  const columns = card.series.map((series) => ({
    heading: series.side ? SIDE_LABELS[series.side] : 'Value',
    byAssessment: new Map(series.points.map((point) => [point.assessmentId, point.degrees])),
  }))
  // One row per assessment that measured this movement in this mode, by
  // day measured, newest first.
  const rows = new Map<number, string>()
  for (const series of card.series) {
    for (const point of series.points) rows.set(point.assessmentId, point.measuredOn)
  }
  const ordered = [...rows].sort(([a, dayA], [b, dayB]) => dayB.localeCompare(dayA) || b - a)
  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-medium">
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-90" />
        Show the values as a table
      </summary>
      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th scope="col" className="p-2 font-medium">
                Measured
              </th>
              {columns.map((column) => (
                <th key={column.heading} scope="col" className="p-2 text-right font-medium">
                  {column.heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map(([assessmentId, day]) => (
              <tr key={assessmentId} className="border-t">
                <th scope="row" className="p-2 text-left font-normal">
                  {formatShortDate(day)}
                </th>
                {columns.map((column) => {
                  const degrees = column.byAssessment.get(assessmentId)
                  return (
                    <td key={column.heading} className="p-2 text-right tabular-nums">
                      {degrees === undefined ? (
                        // Not measured that day on this side: a dash for
                        // the eye, the words for a screen reader.
                        <>
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Not measured</span>
                        </>
                      ) : (
                        degreesText(degrees)
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}