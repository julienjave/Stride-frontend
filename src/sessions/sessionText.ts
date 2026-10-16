import { formatShortDate } from '@/common/calendarDate'
import { attemptText, END_REASON_TEXT } from '@/assigned-programs/progressText'
import type { StartChoice, StartableStatus } from './startRules'
import type { Session } from './types'

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