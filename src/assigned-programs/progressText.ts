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

import { daysBetween, formatShortDate } from '@/common/calendarDate'
import type {
  DayState,
  ExtraReason,
  ScheduleSummary,
  ScheduledDay,
  SessionAttempt,
  SessionEndReason,
  WeekState,
} from './types'

// The words of the program page's progress, in one place: each state and
// each reason has exactly one wording, so a day can't be "Missed" in one
// part of the page and "Not done" in another. Records keyed by the API's
// union types: a new state from the backend without a wording here is a
// COMPILE error (the same trick as PROGRAM_STATUS_LABELS).

// --- BADGES -------------------------------------------------------------------------

// A badge's look. Every badge shows its WORD; the colour only repeats it —
// never colour alone (colour-blind readers, screen readers, a grey-scale
// printout all get the word).
export type Tone = 'good' | 'bad' | 'pending' | 'neutral'

export const DAY_STATE_BADGE: Record<DayState, { label: string; tone: Tone }> = {
  done: { label: 'Done', tone: 'good' },
  made_up: { label: 'Made up', tone: 'good' },
  // Fulfilled, so 'good' like the others — the WORD says "late", and the
  // sentence says when (dayDetail); the totals count it apart.
  made_up_late: { label: 'Made up late', tone: 'good' },
  done_early: { label: 'Done early', tone: 'good' },
  swapped: { label: 'Swapped', tone: 'good' },
  missed: { label: 'Missed', tone: 'bad' },
  due: { label: 'To do', tone: 'pending' },
  upcoming: { label: 'Upcoming', tone: 'neutral' },
}

export const WEEK_STATE_BADGE: Record<WeekState, { label: string; tone: Tone }> = {
  met: { label: 'Met', tone: 'good' },
  missed: { label: 'Missed', tone: 'bad' },
  in_progress: { label: 'In progress', tone: 'pending' },
  upcoming: { label: 'Upcoming', tone: 'neutral' },
}

// --- ONE DAY ------------------------------------------------------------------------

// The sentence under a day's badge, when there's more to say than the
// badge: WHEN a make-up or a swap happened (decided: "make-ups and swaps
// say when"), and why a past day still says "To do". `locale` only for
// tests (formatShortDate's).
export function dayDetail(day: ScheduledDay, today: string, locale?: string): string | null {
  switch (day.state) {
    case 'made_up':
      return day.madeUpBy ? `Made up on ${formatShortDate(day.madeUpBy.date, locale)}` : null
    case 'made_up_late':
      return day.madeUpLateBy
        ? `Made up late on ${formatShortDate(day.madeUpLateBy.date, locale)}`
        : null
    case 'done_early':
      return day.doneEarlyBy
        ? `Done early on ${formatShortDate(day.doneEarlyBy.date, locale)}`
        : null
    case 'swapped':
      // The OTHER scheduled day of the exchange — before or after this one.
      return day.swappedBy ? `Swapped with ${formatShortDate(day.swappedBy.date, locale)}` : null
    case 'due':
      // 'due' covers today AND a past day whose make-up window is still
      // open (until the next scheduled day) — the second needs saying, or
      // a past day marked "To do" looks like a bug.
      return day.date < today ? 'Not done yet — can still be made up before the next session' : null
    default:
      return null
  }
}

// --- EXTRA SESSIONS -----------------------------------------------------------------

// Why a completed session didn't count — the backend's ExtraReason, worded
// for a practitioner. An extra isn't a fault: it's a session the patient
// did that the schedule didn't ask for (decided 2026-10-10: the
// practitioner sees it, e.g. a patient overdoing it).
export const EXTRA_REASON_TEXT: Record<ExtraReason, string> = {
  same_day: 'Another session the same day',
  outside_program: "Outside the program's dates",
  no_missed_day: 'On a day with nothing scheduled or to make up',
  beyond_target: "After the week's target was reached",
  wrong_workout: 'Not the workout that was planned',
  repeated_workout: 'A workout the week had already done',
  paused: 'While the program was paused',
  swap_not_counted: "Done for another day, but it couldn't count for it",
  already_done: 'That day was already done, ahead of time or by a swap',
}

// --- SESSIONS THAT DIDN'T COUNT: SKIPPED OR NOT FINISHED -----------------------------

// Why a session ended without being completed, in a few words. A Record over
// the backend's enum, like the badges: a new reason without a wording is a
// compile error.
export const END_REASON_TEXT: Record<SessionEndReason, string> = {
  pain: 'pain',
  illness: 'illness',
  no_time: 'no time',
  other: 'another reason',
  not_finished_in_time: 'left open until a later session started',
  program_closed: 'the program was closed',
}

// One attempt as a label under its day (or in its week): "Skipped
// (illness)", "Stopped (pain)", "Not finished (the program was closed)".
//   - skipped: the patient said "not today" before starting — always one of
//     THEIR reasons (the database refuses the app's two on a skip);
//   - incomplete, with a patient's reason: they pressed Stop → "Stopped";
//   - incomplete, with the app's reason: nobody stopped it — it was still
//     open when the app closed it → "Not finished". "Stopped" would say the
//     patient did something they didn't.
// The patient's note is not in the summary (it's in the session itself):
// the label stays short.
export function attemptText(attempt: Pick<SessionAttempt, 'status' | 'endReason'>): string {
  const reason = END_REASON_TEXT[attempt.endReason]
  if (attempt.status === 'skipped') return `Skipped (${reason})`
  return isPatientReason(attempt.endReason) ? `Stopped (${reason})` : `Not finished (${reason})`
}

// The two reasons only the app writes. A Set rather than a comparison
// with each: one place lists them.
const APP_REASONS: ReadonlySet<SessionEndReason> = new Set([
  'not_finished_in_time',
  'program_closed',
])

// Exported for the progress charts (2026-10-18): a stopped session reached
// the check-out only when the PATIENT stopped it (progress/scoreRules.ts).
export function isPatientReason(reason: SessionEndReason): boolean {
  return !APP_REASONS.has(reason)
}

// --- TOTALS ---------------------------------------------------------------------------

// The totals in two lines:
//   - headline: "4 of 12 sessions done" with an end date (decided: "of N"
//     when there's an end date), "4 sessions done" when open-ended — an
//     open-ended program has no total, so no "of" (decisions §5);
//   - parts: what's behind it, only the non-zero ones ("1 made up · 1
//     swapped · 1 missed · 1 skipped · 1 not finished · 2 extra"), or null
//     when there's nothing to add.
// "Skipped" and "not finished" count SESSIONS (attempts), not days: a
// skipped day is in "missed" too (or "made up", if a make-up followed) —
// the attempt says how it went, never instead of what counted. "Not
// finished" covers every incomplete session, stopped by the patient or
// closed by the app (attemptText tells them apart, day by day).
// "Done" in the headline counts every FULFILLED session — done on the day,
// made up (on time or late), done early or swapped: each one did what the
// schedule asked. "Made up late" is its own part, never folded into "made
// up": the practitioner sees how much was caught up late (2026-10-16).
export function totalsText(totals: ScheduleSummary['totals']): {
  headline: string
  parts: string | null
} {
  const fulfilled =
    totals.done + totals.madeUp + totals.madeUpLate + totals.doneEarly + totals.swapped
  const sessions = (count: number) => (count === 1 ? 'session' : 'sessions')
  const headline =
    totals.expected === null
      ? `${fulfilled} ${sessions(fulfilled)} done`
      : `${fulfilled} of ${totals.expected} ${sessions(totals.expected)} done`

  const parts = [
    totals.madeUp > 0 ? `${totals.madeUp} made up` : null,
    totals.madeUpLate > 0 ? `${totals.madeUpLate} made up late` : null,
    totals.doneEarly > 0 ? `${totals.doneEarly} done early` : null,
    totals.swapped > 0 ? `${totals.swapped} swapped` : null,
    totals.missed > 0 ? `${totals.missed} missed` : null,
    totals.skipped > 0 ? `${totals.skipped} skipped` : null,
    totals.incomplete > 0 ? `${totals.incomplete} not finished` : null,
    totals.extra > 0 ? `${totals.extra} extra` : null,
  ].filter((part) => part !== null)

  return { headline, parts: parts.length > 0 ? parts.join(' · ') : null }
}

// --- A WEEK'S HEADING -----------------------------------------------------------------

// "Week 2 · Fri 9 Oct – Thu 15 Oct": the week's dates, always — "week 2"
// alone would be read as a calendar week (decisions §5, point 6).
export function weekTitle(
  week: { programWeek: number; start: string; end: string },
  locale?: string,
): string {
  const dates =
    week.start === week.end
      ? formatShortDate(week.start, locale)
      : `${formatShortDate(week.start, locale)} – ${formatShortDate(week.end, locale)}`
  return `Week ${week.programWeek} · ${dates}`
}

// The week's result in a few words, beside its title (folded weeks show
// only this): "2 of 3 done · 1 missed", or "Paused", or "Nothing scheduled".
export function weekResult(week: {
  expected: number
  fulfilled: number
  missed: number
  pauses: readonly unknown[]
}): string {
  if (week.expected === 0) return week.pauses.length > 0 ? 'Paused' : 'Nothing scheduled'
  const result = `${week.fulfilled} of ${week.expected} done`
  return week.missed > 0 ? `${result} · ${week.missed} missed` : result
}

// --- A WEEKLY COUNT CUT SHORT --------------------------------------------------------

// The note under an "N times a week" count that covers only PART of its
// week (an end date, a schedule change or a pause cut it): its dates, and
// that its target was scaled to them — otherwise "0 of 2" under "3× a week"
// looks like a mistake. "Tue 9 Jun – Thu 12 Jun: target 2 for these 4 days".
export function stretchNote(
  stretch: { start: string; end: string; target: number },
  locale?: string,
): string {
  const length = daysBetween(stretch.start, stretch.end) + 1
  const dates =
    stretch.start === stretch.end
      ? formatShortDate(stretch.start, locale)
      : `${formatShortDate(stretch.start, locale)} – ${formatShortDate(stretch.end, locale)}`
  return `${dates}: target ${stretch.target} for ${
    length === 1 ? 'this day' : `these ${length} days`
  }`
}

// --- UP NEXT ---------------------------------------------------------------------------

// "Up next" in words, from the summary's nextWorkout:
//   - a specific day: today → "A · Mobility, today"; a later day → "…, on
//     Wed 14 Oct"; a PAST day (its make-up window still open) → "…, to make
//     up Mon 5 Oct";
//   - a weekly count: "A · Mobility, for week 2" (the program week still
//     needing it — its dates are on the week below).
// workoutLabel null = one workout, nothing to name: "A session, today".
// null when there's nothing next — the page says why (paused, or over).
export function upNextText(
  next: ScheduleSummary['nextWorkout'],
  today: string,
  workoutLabel: string | null,
  locale?: string,
): string | null {
  if (!next) return null
  const what = workoutLabel ?? 'A session'
  if (next.forDay !== null) {
    if (next.forDay === today) return `${what}, today`
    if (next.forDay < today) return `${what}, to make up ${formatShortDate(next.forDay, locale)}`
    return `${what}, on ${formatShortDate(next.forDay, locale)}`
  }
  return next.programWeek !== null ? `${what}, for week ${next.programWeek}` : what
}