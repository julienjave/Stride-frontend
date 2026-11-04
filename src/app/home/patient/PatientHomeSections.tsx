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
import type { UseQueryResult } from '@tanstack/react-query'
import { LoadError } from '@/common/LoadError'
import { RetryFocus } from '@/common/RetryFocus'
import { ViewProgramLink } from '@/sessions/ViewProgramLink'
import { Card, CardContent } from '@/components/ui/card'
import { ProgramProgressBar } from '@/assigned-programs/ProgramProgressBar'
import type { AssignedProgramListItem, ScheduleSummary } from '@/assigned-programs/types'
import { PainTrend } from '@/progress/PainTrend'
import { todayRow, workoutLabel, type TodayRow } from '@/sessions/todayRow'
import { TodayRowView } from '@/sessions/TodayRowView'
import { upcomingItems, type ProgramWithSummary } from './patientHomeRules'
import { longDate, upcomingText } from './patientHomeText'
import { LinesSkeleton } from '@/common/Loading'

// The patient home's three sections (decisions §2): Today and Upcoming in
// one card, then "My programs". They only DRAW: what each program asks is
// decided by patientHomeRules, worded by patientHomeText.

// One program and its summary's query, in the same order
// (useActiveProgramSummaries).
export interface HomeEntry {
  program: AssignedProgramListItem
  summary: UseQueryResult<ScheduleSummary>
}

// --- TODAY AND UPCOMING ------------------------------------------------------------

// One card, stacked: on a phone (the patient's main device, decisions §1)
// two side-by-side columns would squeeze each line to a few words, so
// Upcoming goes under Today at every width — the practitioner's card puts
// its short slots in columns; this card's content is lines of text.
export function TodayAndUpcomingCard({ entries, today }: { entries: HomeEntry[]; today: string }) {
  return (
    <Card>
      <CardContent className="space-y-6">
        <TodaySection entries={entries} today={today} />
        <UpcomingSection entries={entries} today={today} />
      </CardContent>
    </Card>
  )
}

// The rows' content — what each says and offers — is todayRow's decision
// (src/sessions/, shared with the Sessions hub since 2026-10-17); this
// section only lists one per program, with its program's title above it.
// A failed summary is a row too: its load error, with "Try again" (the one
// place a failed summary is reported — Upcoming leaves the program out, and
// the program's card under My programs shows no progress).
type HomeTodayRow =
  | { program: AssignedProgramListItem; row: TodayRow; failed?: undefined; loading?: undefined }
  | { program: AssignedProgramListItem; failed: UseQueryResult<ScheduleSummary>; loading?: undefined }
  | { program: AssignedProgramListItem; loading: true; failed?: undefined }

// The load error's words — one for every program's row: each row sits under
// its program's title, and only the row that was retried can take a retry's
// memory (its RetryFocus watches ITS summary).
const TODAY_WHAT = "today's plan"

function TodaySection({ entries, today }: { entries: HomeEntry[]; today: string }) {
  // One row per program that has something to say today — loading, failed,
  // or a status. A program with nothing today gets no row: three programs
  // each saying "Nothing today" would bury the one that has something.
  const rows = entries.flatMap(({ program, summary }): HomeTodayRow[] => {
    if (summary.isPending) return [{ program, loading: true }]
    if (summary.isError) return [{ program, failed: summary }]
    const row = todayRow(program, summary.data, today)
    return row ? [{ program, row }] : []
  })
  // After a "Try again" that worked, focus goes to this section's heading:
  // the row that came back may have nothing to say today, and vanish.
  const heading = useRef<HTMLHeadingElement>(null)

  return (
    <section aria-labelledby="home-today" className="space-y-3">
      {entries.map(({ program, summary }) => (
        <RetryFocus key={program.id} target={heading} what={TODAY_WHAT} shown={summary.isSuccess} />
      ))}
      <div>
        <h2
          ref={heading}
          tabIndex={-1}
          id="home-today"
          className="text-sm font-semibold uppercase text-muted-foreground outline-none"
        >
          Today
        </h2>
        <p className="font-medium">{longDate(today)}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing to do today.</p>
      ) : (
        // A list: a screen reader says how many items, and each program is
        // one stop.
        <ul className="space-y-4">
          {rows.map((entry) => (
            <li key={entry.program.id}>
              {entry.loading ? (
                // The program's title is known (the list came first); its
                // plan for today is on the way.
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">{entry.program.title}</p>
                  <LinesSkeleton label={`Loading today's plan for ${entry.program.title}…`} lines={1} />
                </div>
              ) : entry.failed ? (
                <div className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">{entry.program.title}</p>
                  <LoadError what={TODAY_WHAT} queries={[entry.failed]} />
                </div>
              ) : (
                <TodayRowView
                  eyebrow={entry.program.title}
                  programTitle={entry.program.title}
                  row={entry.row}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function UpcomingSection({ entries, today }: { entries: HomeEntry[]; today: string }) {
  // Built from every summary at once (the soonest days ACROSS programs), so
  // it waits for all of them — a list that reshuffles as each answer
  // arrives would be worse than a moment's "Loading…". A program whose
  // summary failed is left out; Today already says it failed.
  const loading = entries.some(({ summary }) => summary.isPending)
  const loaded: ProgramWithSummary[] = entries.flatMap(({ program, summary }) =>
    summary.data ? [{ program, summary: summary.data }] : [],
  )
  const byId = new Map(entries.map(({ program }) => [program.id, program]))
  const items = loading ? [] : upcomingItems(loaded, today)

  return (
    <section aria-labelledby="home-upcoming" className="space-y-3">
      <h2 id="home-upcoming" className="text-sm font-semibold uppercase text-muted-foreground">
        Upcoming
      </h2>
      {loading ? (
        <LinesSkeleton label="Loading what's coming up…" lines={3} />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing planned in the next two weeks.</p>
      ) : (
        <ul className="space-y-1.5 text-sm">
          {items.map((item) => {
            // Every item names a program of `entries` (upcomingItems only
            // returns theirs), so the lookup always finds it.
            const program = byId.get(item.programId)!
            const label = item.kind === 'day' ? workoutLabel(program, item.workoutId) : null
            const { when, what, workout } = upcomingText(item, program.title, label)
            return (
              // A program has at most one line per date, and at most one
              // weekly line: kind + program + date is unique.
              <li
                key={`${item.kind}-${item.programId}-${'date' in item ? item.date : ''}`}
                className="flex gap-3"
              >
                {/* A fixed width, so every WHAT starts at the same place;
                    shrink-0 so a long WHAT wraps instead of squeezing it. */}
                <span className="w-24 shrink-0 font-medium">{when}</span>
                <span className="min-w-0">
                  {what}
                  {/* whitespace-nowrap: the label wraps as a whole, never
                      between "A ·" and "Mobility". */}
                  {workout !== null && (
                    <>
                      : <span className="whitespace-nowrap">{workout}</span>
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// --- MY PROGRAMS --------------------------------------------------------------------

// One card per active program, listed equally: its title, who assigned it,
// and how it's going — "4 of 12 sessions done" with a bar when it has an end
// date, "5 sessions done" when it's open-ended (no total, so no bar —
// decisions §5) — and "View program", to the patient's program page (the
// Sessions hub's pass 2, 2026-10-18).
export function MyProgramsSection({ entries }: { entries: HomeEntry[] }) {
  return (
    <section aria-labelledby="home-programs" className="space-y-3">
      <h2 id="home-programs" className="text-lg font-semibold">
        My programs
      </h2>
      <ul className="space-y-3">
        {entries.map(({ program, summary }) => (
          <li key={program.id} className="space-y-2 rounded-lg border p-4">
            <div>
              <h3 className="font-medium">{program.title}</h3>
              {program.assigner && (
                <p className="text-sm text-muted-foreground">
                  From {program.assigner.firstName} {program.assigner.lastName}
                </p>
              )}
            </div>
            {summary.isPending && <LinesSkeleton label={`Loading the progress of ${program.title}…`} lines={1} />}
            {/* A failed summary says so once, with "Try again", in its Today
                row above (2026-10-28) — not twice on one screen. */}
            {summary.data && <ProgramProgressBar title={program.title} summary={summary.data} />}
            {/* How the pain has gone lately (2026-10-18, with the progress
                page; decisions §2) — quiet until there's something to say. */}
            <PainTrend programId={program.id} />
            <ViewProgramLink program={program} />
          </li>
        ))}
      </ul>
    </section>
  )
}