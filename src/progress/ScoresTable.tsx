import { ChevronRight } from 'lucide-react'
import { formatShortDate } from '@/common/calendarDate'
import { sessionStatusText } from '@/sessions/sessionText'
import { wasAsked, type ScoreKey, type ScoredSession } from './scoreRules'
import { scoreValueText } from './scoreText'

// The charts' TABLE twin (the dataviz rule: every chart has one): the same
// sessions, every value as text — for a screen reader, for the keyboard,
// for anyone who'd rather read numbers than lines. Folded by default (the
// picture says it at a glance); a native <details>, so the browser handles
// opening it, keyboard included — with the app's chevron, like the weeks.
//
// NEWEST first, unlike the charts: a table is read from the top, and the
// latest session is what a reader looks for.
const COLUMNS: { key: ScoreKey; heading: string }[] = [
  { key: 'painBefore', heading: 'Pain before' },
  { key: 'painAfter', heading: 'Pain after' },
  { key: 'mobilityAfter', heading: 'Mobility' },
]

export function ScoresTable<T extends ScoredSession>({
  sessions,
  workoutOf,
}: {
  // Oldest first, as the charts get them.
  sessions: readonly T[]
  workoutOf: (workoutId: number) => string | null
}) {
  const rows = [...sessions].reverse()
  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer items-center gap-2 p-3 text-sm font-medium">
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
        />
        Show the scores as a table
      </summary>
      {/* Wider than a phone: the table scrolls sideways inside its own box,
          never the page. */}
      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th scope="col" className="p-2 font-medium">
                Session
              </th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" className="p-2 text-right font-medium">
                  {column.heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((session) => {
              const workout = workoutOf(session.workoutId)
              return (
                <tr key={session.id} className="border-t">
                  {/* The row's header: a screen reader announces it with
                      each cell ("Thu 11 Jun, Pain after, 2"). */}
                  <th scope="row" className="p-2 text-left font-normal">
                    <span className="block">{formatShortDate(session.localDate)}</span>
                    {(workout || session.status !== 'completed') && (
                      <span className="block text-xs text-muted-foreground">
                        {[workout, session.status === 'completed' ? null : sessionStatusText(session)]
                          .filter((part) => part !== null)
                          .join(' · ')}
                      </span>
                    )}
                  </th>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="p-2 text-right tabular-nums">
                      {scoreValueText(session[column.key], wasAsked(session, column.key))}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}