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

import { addDays, formatShortDate, isCalendarDate, isoWeekday } from '@/common/calendarDate'
import { currentAndPlanned, describeVersion, type WorkoutNames } from './programSchedule'
import {
  draftFromVersion,
  emptyScheduleDraft,
  resolveDays,
  resolveRotation,
  type ScheduleDraft,
} from './scheduleDraft'
import type { ScheduleVersion, ScheduleVersionInput } from './types'

// The program page's "Change schedule", "Pause" and "Resume" (3a-2), as
// pure rules: which days a new version may start on, what it would
// replace, what's wrong with the form, and the request body. The form
// (ScheduleChangeForm) only calls these; the tests check them with plain
// values — the same split as assignForm.ts.
//
// All three write the same thing — a schedule version, "from that day on,
// the schedule is …" (POST …/schedules) — so they share one set of rules.
// A resume is simply a schedule starting after a pause.

export type ScheduleChangeKind = 'change' | 'pause' | 'resume'

// The first and last day a new version may start on — or null when there
// is none (the program's end has passed: nothing left to change).
export interface ChangeWindow {
  earliest: string
  // null = open-ended: no last day.
  latest: string | null
}

// The backend's rules (assertScheduleDayAllowed + the "can't start paused"
// check), said BEFORE saving so the date field can offer only allowed days:
//   - not before the program starts — a version there would apply to no day;
//   - not after it ends — same;
//   - not in the past: past days were judged by the schedule in force then,
//     and a change must never rewrite that history (decisions §5);
//   - a pause, not ON the start date: a program can't begin paused (it
//     would replace the first schedule; assign it later instead).
// `today` is the viewer's (their device's date). The backend allows one day
// of slack for time zones; the page is stricter, never looser — so what it
// offers is always accepted.
export function changeWindow(
  program: { startDate: string; endDate: string | null },
  today: string,
  kind: ScheduleChangeKind,
): ChangeWindow | null {
  const firstAllowed = kind === 'pause' ? addDays(program.startDate, 1) : program.startDate
  // 'YYYY-MM-DD' strings compare in date order (calendarDate.ts), so the
  // later of two dates is a plain string comparison.
  const earliest = today > firstAllowed ? today : firstAllowed
  if (program.endDate !== null && earliest > program.endDate) return null
  return { earliest, latest: program.endDate }
}

// The first day of the NEXT program week after `day` — or null when `day`
// already starts one. Program weeks start on the start date's weekday
// (decisions §5, point 6), so it's the next day with that weekday.
//
// Why it matters: an "N a week" change in the middle of a program week
// splits that week in two, and each part's target is scaled to its length
// (the schedule module's rule). Often what the practitioner means is "from
// next week", so the form offers that day as a shortcut.
export function nextProgramWeekStart(startDate: string, day: string): string | null {
  // How many days until the weekday weeks start on: 0–6. `+ 7` before `% 7`
  // keeps it positive (in JavaScript, -2 % 7 is -2, not 5).
  const daysAhead = (isoWeekday(startDate) - isoWeekday(day) + 7) % 7
  return daysAhead === 0 ? null : addDays(day, daysAhead)
}

// The versions saving would REPLACE: every one starting on that day or
// later (the backend deletes them in the same transaction). The same day =
// a correction; a later day = a change planned earlier, now superseded.
// Shown before saving: replacing is the right rule, but it must never be a
// surprise.
export function replacedVersions(
  versions: readonly ScheduleVersion[],
  from: string,
): ScheduleVersion[] {
  return versions.filter((version) => version.effectiveFrom >= from)
}

// The replaced versions in words, for the form's warning — null when
// nothing is replaced.
export function replacedText(
  versions: readonly ScheduleVersion[],
  from: string,
  names: WorkoutNames,
  startDate: string,
  locale?: string,
): { heading: string; items: string[] } | null {
  const replaced = replacedVersions(versions, from)
  if (replaced.length === 0) return null
  return {
    heading:
      replaced.length === 1
        ? 'Saving replaces what was already set from that day on:'
        : `Saving replaces the ${replaced.length} versions already set from that day on:`,
    items: replaced.map(
      (version) =>
        `From ${formatShortDate(version.effectiveFrom, locale)}: ${describeVersion(version, names, startDate)}`,
    ),
  }
}

// The draft the editor opens with: the schedule in force today — or, when
// that is a pause (resuming), the last real schedule before it, as
// "back to how it was" is the likely intent. Never a planned change: the
// form edits from what the patient follows now. No real schedule at all
// (not possible today: a program starts with one) → a new draft.
//
// Workouts by the program's ids, in the program's order (the order the
// backend sends, A first). An id the program no longer has leaves that day
// to the suggestion (draftFromVersion's `refOf` returning null).
export function startingDraft(
  versions: readonly ScheduleVersion[],
  workoutIds: readonly number[],
  today: string,
): ScheduleDraft {
  const { current } = currentAndPlanned(versions, today)
  const upTo = current ? versions.indexOf(current) : -1
  const base = versions
    .slice(0, upTo + 1)
    .reverse()
    .find((version) => version.type !== 'paused')
  if (!base) return emptyScheduleDraft()
  return draftFromVersion(
    base,
    (workoutId) => (workoutIds.includes(workoutId) ? workoutId : null),
    workoutIds,
  )
}

export interface ScheduleChangeProblems {
  from?: string
  schedule?: string
}

// What's wrong with the form, field by field (empty = nothing). The same
// order as the backend's checks, so the message is the one it would give
// — but said next to the field, before any request.
export function scheduleChangeProblems(
  kind: ScheduleChangeKind,
  from: string,
  draft: ScheduleDraft,
  program: { startDate: string; endDate: string | null },
  today: string,
  locale?: string,
): ScheduleChangeProblems {
  const problems: ScheduleChangeProblems = {}
  if (!isCalendarDate(from)) {
    problems.from = 'Choose a day'
  } else if (from < program.startDate) {
    problems.from = `The program starts on ${formatShortDate(program.startDate, locale)}: choose that day or later`
  } else if (program.endDate !== null && from > program.endDate) {
    problems.from = `The program ends on ${formatShortDate(program.endDate, locale)}: choose that day or earlier`
  } else if (from < today) {
    problems.from = 'That day has passed: choose today or later'
  } else if (kind === 'pause' && from === program.startDate) {
    problems.from = "A program can't start paused: choose a later day"
  }
  // A pause has no schedule to check.
  if (kind !== 'pause' && draft.type === 'weekdays' && draft.days.length === 0) {
    problems.schedule = 'Tick at least one day'
  }
  return problems
}

// The request body. `workoutIds` are the program's workouts in order.
//   - A pause: only its day and type.
//   - Specific days: every ticked day with its workout resolved — a day left
//     to the suggestion is sent as the suggested workout (what the editor
//     showed), never as "nothing".
//   - N a week: the count, and the rotation only when it was edited and
//     there is something to rotate. Not edited = every workout in order,
//     which is also the backend's default when none is sent.
// Only the chosen kind's fields: the backend refuses another kind's (400).
//   - A pause with a back-on day (`backOn`, roadmap Phase 6.5): `resumeOn`
//     too — only when one was chosen ('' = open-ended, the key left out, so
//     an open pause's body is exactly what it always was).
export function toScheduleVersionInput(
  kind: ScheduleChangeKind,
  from: string,
  draft: ScheduleDraft,
  workoutIds: readonly number[],
  backOn = '',
): ScheduleVersionInput {
  if (kind === 'pause') {
    return backOn === ''
      ? { effectiveFrom: from, type: 'paused' }
      : { effectiveFrom: from, type: 'paused', resumeOn: backOn }
  }
  if (draft.type === 'weekdays') {
    return {
      effectiveFrom: from,
      type: 'weekdays',
      days: resolveDays(draft.days, workoutIds).map((day) => ({
        weekday: day.weekday,
        workoutId: day.workout,
      })),
    }
  }
  return {
    effectiveFrom: from,
    type: 'times_per_week',
    timesPerWeek: draft.timesPerWeek,
    ...(draft.rotation !== null && workoutIds.length > 1
      ? { rotation: resolveRotation(draft, workoutIds) }
      : {}),
  }
}

// --- A PAUSE WITH AN END (roadmap Phase 6.5) ---------------------------------

// What's wrong with the pause's optional "Back on" day — undefined when
// nothing is ('' = no back-on day: an open-ended pause, as before). The
// backend's rules (assertResumeDayAllowed), said at the field before any
// request: after the pause starts, and not after the program's last day.
// Judged against `from` only once `from` is itself a day — otherwise the
// "Pause from" field already says what's wrong.
export function backOnProblem(
  backOn: string,
  from: string,
  program: { endDate: string | null },
  locale?: string,
): string | undefined {
  if (backOn === '') return undefined
  if (!isCalendarDate(backOn)) return 'Choose a day, or leave it empty'
  if (isCalendarDate(from) && backOn <= from) {
    return 'Choose a day after the pause starts'
  }
  if (program.endDate !== null && backOn > program.endDate) {
    return `The program ends on ${formatShortDate(program.endDate, locale)}: leave this empty to pause until the end`
  }
  return undefined
}

// The schedule that comes back on the back-on day, in words — the same
// rule as the backend's contentBeforePause: the LAST version starting
// before the pause that isn't itself a pause. Said before saving, so "back
// to what?" is never a surprise. null when there is none (not possible
// through the app: a program starts with a real schedule).
export function scheduleAfterPause(
  versions: readonly ScheduleVersion[],
  from: string,
  names: WorkoutNames,
  startDate: string,
): string | null {
  const before = versions.filter(
    (version) => version.effectiveFrom < from && version.type !== 'paused',
  )
  // The versions come oldest first (the backend's order), so the last one
  // is the latest.
  const last = before.at(-1)
  return last ? describeVersion(last, names, startDate) : null
}