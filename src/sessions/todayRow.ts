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

import { workoutNames } from '@/assigned-programs/programSchedule'
import type { AssignedProgramListItem, ScheduleSummary } from '@/assigned-programs/types'
import { leftOpenText } from './sessionText'
import { sessionLeftOpen, startChoice } from './startRules'
import { lateMakeUpWaiting, todayStatus } from './todayStatus'
import { lateMakeUpWaitingText, todayText, type TodayText } from './todayText'

// One program's TODAY row — what it says and which buttons it offers. Shared
// by the patient home and the Sessions hub (moved out of the home's
// sections on 2026-10-17, when the hub became its second reader), so both
// screens say the same thing about the same day. Pure: the words come from
// todayText, the decision from todayStatus / startChoice (todayRow.test.ts).

// "B · Strength" when the program has several workouts, null with one —
// naming the only workout says nothing.
export function workoutLabel(
  program: Pick<AssignedProgramListItem, 'workouts'>,
  workoutId: number,
): string | null {
  const names = workoutNames(program.workouts)
  return names.several ? names.labelOf(workoutId) : null
}

// A Today row's button — the session flow's way in (Phase 4, 2026-10-16):
// "Start" leads to the start page (which asks the pain question and only
// then writes anything); "Resume" back into today's open session; "Skip
// today" (pass (c)) to the skip page — on a DUE row only, the one case the
// backend accepts (a scheduled day of a specific-days schedule). "Make it
// up" (2026-10-16) is a Start too — the same start page, which decides it
// again from a fresh summary — named for what it does: the row is about a
// missed day, and "Start" under "Make up: Mon 12 Oct's…" read as today's.
export interface TodayAction {
  verb: 'Start' | 'Make it up' | 'Resume' | 'Skip today'
  to: string
}

export interface TodayRow {
  text: TodayText
  // Lines of their own under the row's words, each its own paragraph: a
  // session left open on an earlier day; a late make-up waiting for another
  // day. Apart from `text.detail` — joined to it, a note ran into the
  // detail's last words ("Stopped earlier today (pain) Your session of…",
  // found in the live check).
  notes: string[]
  action: TodayAction | null
  // Beside the main action, quieter: "Skip today" on a due row.
  secondary: TodayAction | null
}

// Where a screen shows MAKE-UPS (a missed day caught up on time, or late):
//   - 'in_row' — the home: the row itself offers the one todayStatus picks
//     (the on-time catch-up first, else the oldest late one), and a quiet
//     note says when late ones wait;
//   - 'apart'  — the Sessions hub: every make-up has a row of its own in the
//     program's "To make up" list (makeUpRules.ts), each with its button —
//     so the Today row leaves them out, rather than offering one of them
//     twice. A day whose only business is a make-up then has no row.
export type MakeUpPlacement = 'in_row' | 'apart'

// What a loaded program's row says and offers — or null: no row.
export function todayRow(
  program: Pick<AssignedProgramListItem, 'id' | 'workouts'>,
  summary: ScheduleSummary,
  today: string,
  makeUps: MakeUpPlacement = 'in_row',
): TodayRow | null {
  const found = todayStatus(summary, today)
  const apart = makeUps === 'apart'
  // Apart, a make-up status is no TODAY status: its row is in the list.
  const status =
    apart && (found?.kind === 'catch_up' || found?.kind === 'late_make_up') ? null : found
  // An open session from an EARLIER day (decided 2026-10-16): no Resume —
  // it can't be finished any more, and the next Start closes it — just one
  // sentence, so the patient isn't surprised to see it "not finished".
  const leftOpen = sessionLeftOpen(summary, today)
  // The note about late make-ups waiting: only where they have no list of
  // their own.
  const waiting = apart ? null : lateMakeUpWaiting(summary, status)
  const notes = [
    leftOpen ? leftOpenText(leftOpen.localDate) : null,
    waiting
      ? lateMakeUpWaitingText(
          waiting.oldest,
          waiting.count,
          waiting.alsoToday,
          workoutLabel(program, waiting.oldest.workoutId),
        )
      : null,
  ].filter((note) => note !== null)
  if (status === null) {
    // Nothing asked today: a row only to say the notes — the first becomes
    // the row's line (no empty heading line above it), the rest stay notes.
    const [first, ...rest] = notes
    return first === undefined
      ? null
      : { text: { line: first, detail: null }, notes: rest, action: null, secondary: null }
  }

  const label = 'workoutId' in status ? workoutLabel(program, status.workoutId) : null
  const text = todayText(status, label)
  // startChoice decides from the SAME todayStatus, so its 'start' is the
  // status shown here — never a make-up when they're apart (filtered above:
  // a make-up status shows no row, so no button).
  const choice = startChoice(summary, today)
  const action: TodayAction | null =
    choice.kind === 'start'
      ? {
          verb: choice.status.kind === 'late_make_up' ? 'Make it up' : 'Start',
          to: `/patient/sessions/start/${program.id}`,
        }
      : choice.kind === 'resume'
        ? { verb: 'Resume', to: `/patient/sessions/${choice.sessionId}` }
        : null
  const secondary: TodayAction | null =
    status.kind === 'due' ? { verb: 'Skip today', to: `/patient/sessions/skip/${program.id}` } : null
  return { text, notes, action, secondary }
}