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

import type { AssignedProgramListItem, ScheduleSummary } from '@/assigned-programs/types'

// The patient home's rules (Phase 4, decisions §2): which programs, and
// what comes NEXT — read from the backend's
// summary, never worked out from the schedule. The summary has already
// judged every day (due, done, missed…); these functions only PICK what the
// home shows, the same split as programProgress.ts on the practitioner's
// side. Pure: plain values in, plain values out — every rule is a plain
// test (patientHomeRules.test.ts).

// --- UPCOMING --------------------------------------------------------------------

// What comes next, after today (decisions §2: "the next 3–4 sessions,
// minimal — program name + day or date; for times-per-week programs, '2
// more this week'"):
//   - day        — a scheduled day still ahead;
//   - week_rest  — the sessions an "N a week" program's CURRENT week still
//                  needs after today ("2 more this week, by Wed 21 Oct");
//   - week_start — an "N a week" program that hasn't started: when, and
//                  how often (it has no dates to list).
export type UpcomingItem =
  | { kind: 'day'; programId: number; date: string; workoutId: number }
  | { kind: 'week_rest'; programId: number; remaining: number; end: string }
  | { kind: 'week_start'; programId: number; start: string; timesPerWeek: number }

// How many dated sessions the home lists. Weekly lines come after, one per
// program at most: they have no date to sort by.
export const UPCOMING_DAYS = 4

export interface ProgramWithSummary {
  program: AssignedProgramListItem
  summary: ScheduleSummary
}

// Dated days first — the soonest across every program, ties in the
// programs' own order (activePrograms) — then the weekly lines.
export function upcomingItems(
  entries: readonly ProgramWithSummary[],
  today: string,
): UpcomingItem[] {
  const days = entries
    .flatMap(({ program, summary }) =>
      summary.days
        // 'upcoming' is the summary's word for "a scheduled day after
        // today, not done yet" — the state alone says it. (A day after
        // today can also be 'done_early' or 'swapped': done already, so
        // not listed. A date check beside the state could never change
        // the answer — a mutation check showed it — so there is none.)
        .filter((day) => day.state === 'upcoming')
        .map((day): UpcomingItem & { kind: 'day' } => ({
          kind: 'day',
          programId: program.id,
          date: day.date,
          workoutId: day.workoutId,
        })),
    )
    // A stable sort: same-day entries keep the programs' order.
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? -1 : 1))
    .slice(0, UPCOMING_DAYS)

  const weekly = entries.flatMap(({ program, summary }): UpcomingItem[] => {
    const current = summary.weeks.find((stretch) => stretch.start <= today && today <= stretch.end)
    if (current) {
      // What the week still needs AFTER today: today's own session, when the
      // home offers one (nothing done today yet), is in Today, not here. A
      // met week (or a target of 0) needs nothing: `remaining` is 0 or less
      // — no state check needed (a mutation check showed one decided
      // nothing).
      const offeredToday = !current.workouts.some((slot) => slot.date === today)
      const remaining = current.target - current.done - (offeredToday ? 1 : 0)
      return remaining > 0
        ? [{ kind: 'week_rest', programId: program.id, remaining, end: current.end }]
        : []
    }
    // Not started yet, and weekly from its first day: its first week.
    const first = summary.weeks[0]
    if (today < program.startDate && first && first.start === program.startDate) {
      return [
        {
          kind: 'week_start',
          programId: program.id,
          start: program.startDate,
          timesPerWeek: first.timesPerWeek,
        },
      ]
    }
    return []
  })

  return [...days, ...weekly]
}