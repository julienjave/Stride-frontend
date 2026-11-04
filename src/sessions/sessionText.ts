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

import { formatShortDate } from '@/common/calendarDate'
import { attemptText, END_REASON_TEXT } from '@/assigned-programs/progressText'
import type { StartChoice, StartableStatus } from './startRules'
import type { PatientEndReason, Session } from './types'

// The session flow's words, for the PATIENT. Pure, so every wording is a
// plain test (sessionText.test.ts). `locale` only for tests (the app passes
// nothing: the browser's language).

// --- THE START PAGE ----------------------------------------------------------------

// Why THIS workout today — a line under the start page's heading.
export function startContextText(status: StartableStatus, locale?: string): string {
  switch (status.kind) {
    case 'due':
      return "Today's session."
    case 'catch_up':
      // The missed day by its weekday ("Wednesday's"), as the home says it.
      return `Catching up ${weekdayName(status.forDay, locale)}'s session: it was missed, and you can still make it up today.`
    case 'late_make_up':
      // A DATE, not a weekday: a late make-up can be weeks after the day
      // (up to 28), when "Monday's" no longer says which Monday.
      return `Making up ${formatShortDate(status.forDay, locale)} — late: it was missed, and will count as made up late.`
    case 'weekly':
      // The session this one will be: one more than done so far.
      return `Session ${status.done + 1} of ${status.target} this week (${formatShortDate(status.start, locale)} – ${formatShortDate(status.end, locale)}).`
  }
}

// What the start page says when there's nothing to start — a stale link,
// or a second tap after finishing.
export function nothingToStartText(
  status: Extract<StartChoice, { kind: 'none' }>['status'],
): string {
  if (status === null) return 'There is no session to do today for this program.'
  switch (status.kind) {
    case 'done':
      return "Today's session is done."
    case 'week_met':
      return `This week's ${status.target} ${status.target === 1 ? 'session is' : 'sessions are'} done.`
    case 'skipped':
      return `You skipped today's session (${END_REASON_TEXT[status.reason]}).`
    case 'paused':
      return 'This program is paused: there is nothing to do while your practitioner has paused it.'
  }
}

// --- A SESSION LEFT OPEN ON AN EARLIER DAY ------------------------------------------

// Under the program's row on the home (decided 2026-10-16: no Resume — a
// session finishes only on its own day, and the next Start closes it).
export function leftOpenText(localDate: string, locale?: string): string {
  return `Your session of ${formatShortDate(localDate, locale)} was left open. It can no longer be finished, and will be kept as not finished.`
}

// --- THE SESSION PAGE ---------------------------------------------------------------

// The session's state in a few words. A finished session's label is the
// practitioner page's (attemptText — "Stopped (pain)", "Not finished (…)"),
// so the two sides name an ending the same way.
export function sessionStatusText(session: Pick<Session, 'status' | 'endReason'>): string {
  switch (session.status) {
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    case 'incomplete':
    case 'skipped':
      // Both always carry a reason (the database's CHECK
      // sessions_end_reason_matches_status); "another reason" if a row
      // ever didn't, rather than a crash.
      return attemptText({ status: session.status, endReason: session.endReason ?? 'other' })
  }
}

// --- THE FINISH AND STOP PAGES: NOTHING LEFT TO DO ----------------------------------

// A session that has ENDED, opened at Finish or Stop (an old link, a second
// tab). Decided with the person 2026-10-28: one heading for every ending,
// and the session's status in the words the session page already shows —
// before, both pages said "This session is already finished." for ANY
// ending, which was wrong for a stopped or skipped session (the app calls
// those "not finished").
export const ALREADY_ENDED_HEADING = 'Session already ended'

export function alreadyEndedText(session: Pick<Session, 'status' | 'endReason'>): string {
  return `It's recorded as: ${sessionStatusText(session)}. It can no longer be changed.`
}

// Finish, for a session still open from an EARLIER day: completing happens
// on a session's own day, so stopping is what's left. The day is the
// session's own (`localDate` — the one the home's "left open" line names).
export const CANNOT_FINISH_HEADING = 'This session can no longer be finished'

export function earlierDayText(localDate: string, locale?: string): string {
  return `It was started on ${formatShortDate(localDate, locale)}. You can stop it instead: it will be kept as not finished.`
}

// When the session began: "Started at 14:05" on its own day; "Started on
// Tue 13 Oct" on another (the time would say little a day later). The time
// is the START's moment in the viewer's zone (`timeZone` only for tests);
// the day compared is the session's own calendar day (`localDate`), not the
// moment's — the day the session belongs to.
export function startedText(
  session: Pick<Session, 'localDate' | 'startedAt'>,
  today: string,
  locale?: string,
  timeZone?: string,
): string | null {
  if (session.startedAt === null) return null
  if (session.localDate !== today) return `Started on ${formatShortDate(session.localDate, locale)}`
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone }).format(
    new Date(session.startedAt),
  )
  return `Started at ${time}`
}

// The day a session counts for, when it isn't its own (`countsFor` —
// today a late make-up; a swap or a session done early were recorded by
// the backend before the app could start them). Said by the DATE alone, in
// words true of every kind: the session page doesn't load the schedule, so
// it can't tell which kind a session is — and needn't, the home already
// said why. Null for an ordinary session.
export function countsForText(
  session: Pick<Session, 'countsFor'>,
  locale?: string,
): string | null {
  return session.countsFor === null
    ? null
    : `Counts for the session of ${formatShortDate(session.countsFor, locale)}`
}

// "3 of 5 exercises done" — how far the checklist got.
export function checklistProgressText(exercises: readonly { completed: boolean }[]): string {
  const done = exercises.filter((exercise) => exercise.completed).length
  const total = exercises.length
  return `${done} of ${total} ${total === 1 ? 'exercise' : 'exercises'} done`
}

// "Wednesday" — the day's own weekday, read in UTC so it stays the stored
// day whatever the viewer's time zone (the same reason as formatShortDate).
function weekdayName(date: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}
// --- ENDING: FINISH, STOP, SKIP (pass (c)) --------------------------------------------

// The patient's four reasons, in the order offered, with the words they
// read. (The app's own two — not_finished_in_time, program_closed — are
// never offered: the backend refuses them from a client.)
export const REASON_CHOICES: readonly { value: PatientEndReason; label: string }[] = [
  { value: 'pain', label: 'Pain' },
  { value: 'illness', label: 'Feeling unwell' },
  { value: 'no_time', label: 'No time' },
  { value: 'other', label: 'Another reason' },
]

// On the Finish page, when some exercises aren't ticked — a suggestion,
// never a block (decisions §6): a session finished with exercises left
// counts as DONE for the schedule; one stopped is kept as not finished.
export function untickedText(exercises: readonly { completed: boolean }[]): string | null {
  const left = exercises.filter((exercise) => !exercise.completed).length
  if (left === 0) return null
  const which = left === 1 ? "1 exercise isn't ticked" : `${left} exercises aren't ticked`
  return `${which}. If you didn't do ${left === 1 ? 'it' : 'them'}, you can stop the session instead: it will be kept as not finished.`
}

// The confirmation the home shows after each ending (navigation state).
export const ENDING_NOTICE = {
  completed: 'Session finished. Well done!',
  stopped: 'Session stopped. It is kept as not finished.',
  skipped: "Today's session is skipped.",
} as const