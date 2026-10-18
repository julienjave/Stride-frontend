import { formatShortDate } from '@/common/calendarDate'
import { END_REASON_TEXT } from '@/assigned-programs/progressText'
import type { LateMakeUp, SessionEndReason } from '@/assigned-programs/types'
import type { TodayStatus } from './todayStatus'

// What one program asks TODAY, in the patient's words — the Today row of
// the home and of the Sessions hub (todayRow.ts). Moved here from the
// home's words (src/app/home/patient/patientHomeText.ts) on 2026-10-17,
// when the hub became their second reader: the words of todayStatus live
// beside todayStatus. Pure, so every wording is a plain test
// (todayText.test.ts). `locale` only for tests (the app passes nothing: the
// browser's language).
//
// `label`: the workout's name ("B · Strength") when the program has several
// workouts, null when it has one — naming the only workout says nothing.

// --- TODAY -----------------------------------------------------------------------

export interface TodayText {
  // What to do (or what happened), in a few words.
  line: string
  // A second, quieter line when there's more to say — or null.
  detail: string | null
}

export function todayText(status: TodayStatus, label: string | null, locale?: string): TodayText {
  switch (status.kind) {
    case 'in_progress':
      return { line: `In progress: ${label ?? "today's session"}`, detail: null }
    case 'due':
      return { line: label ?? "Today's session", detail: stoppedText(status.stopped) }
    case 'catch_up':
      return {
        // "Catch up: Monday's A · Mobility" — the WEEKDAY, not a date: the
        // window is at most a few days, and that's how people say it.
        line: `Catch up: ${weekdayName(status.forDay, locale)}'s ${label ?? 'session'}`,
        detail: joinLines(
          'Not done yet — you can still make it up today.',
          stoppedText(status.stopped),
        ),
      }
    case 'late_make_up':
      return {
        // "Make up: A · Mobility from Fri, Oct 2" — by DATE, unlike a
        // catch-up: a late make-up can be weeks after the day, and "Monday's"
        // would no longer say which Monday.
        line: `Make up: ${missedSession(status.forDay, label, locale)}`,
        // The deadline is the news: the window closed, but not for good.
        detail: joinLines(
          `Missed — you can still make it up today, or on another free day until ${formatShortDate(status.until, locale)}.`,
          stoppedText(status.stopped),
        ),
      }
    case 'weekly':
      return {
        // The count leads: an "N a week" program asks for sessions on any
        // day, so how far the week has got IS the news.
        line: `${status.done} of ${status.target} done this week`,
        // Its dates every time (decisions §5, point 6): "this week" alone
        // would be read as a calendar week. Then which workout comes next —
        // only when there are several to tell apart.
        detail: [
          `This week runs ${formatShortDate(status.start, locale)} – ${formatShortDate(status.end, locale)}.`,
          label === null ? null : `Next: ${label}.`,
          stoppedText(status.stopped),
        ]
          .filter((part) => part !== null)
          .join(' '),
      }
    case 'done':
      return { line: 'Done for today', detail: null }
    case 'week_met':
      return {
        line: `This week's ${status.target} ${status.target === 1 ? 'session is' : 'sessions are'} done`,
        detail: null,
      }
    case 'skipped':
      return { line: `Skipped today (${END_REASON_TEXT[status.reason]})`, detail: null }
    case 'paused':
      return { line: 'Paused', detail: 'Nothing to do while your practitioner has paused this program.' }
  }
}

// Late make-ups the home mentions without a button (lateMakeUpWaiting):
// one quiet line under the row — "it's there, and until when" (decided
// 2026-10-16). Said for the OLDEST, the first to run out; the others only
// counted, so a long list doesn't take over the home (the Sessions hub
// will list them all). Two wordings:
//   - not today (alsoToday false): "on another free day" — why not today
//     isn't said, the row above shows it (today's own session, done);
//   - today too (alsoToday true, under an on-time catch-up): "also … late"
//     — never "on another free day", which would say today is refused
//     (it isn't: the choice is the patient's, changed 2026-10-17).
export function lateMakeUpWaitingText(
  oldest: LateMakeUp,
  count: number,
  alsoToday: boolean,
  label: string | null,
  locale?: string,
): string {
  const what = missedSession(oldest.forDay, label, locale)
  const until = formatShortDate(oldest.until, locale)
  const first = alsoToday
    ? `You can also make up ${what} late, until ${until}.`
    : `You can still make up ${what} on another free day, until ${until}.`
  if (count === 1) return first
  const others = count - 1
  return `${first} ${others === 1 ? '1 other missed session' : `${others} other missed sessions`} can be made up too.`
}

// A missed day's session, named by its date: "A · Mobility from Fri, Oct 2",
// or "the session of Fri, Oct 2" with one workout. Never a possessive on the
// date — "Fri, Oct 2's" (the US short date has a comma) read badly in the
// live check.
export function missedSession(forDay: string, label: string | null, locale?: string): string {
  const date = formatShortDate(forDay, locale)
  return label === null ? `the session of ${date}` : `${label} from ${date}`
}

// "Stopped earlier today (pain)", or "(pain, then no time)" for two — or
// null when nothing was stopped.
function stoppedText(reasons: readonly SessionEndReason[]): string | null {
  if (reasons.length === 0) return null
  return `Stopped earlier today (${reasons.map((reason) => END_REASON_TEXT[reason]).join(', then ')})`
}

function joinLines(first: string, second: string | null): string {
  return second === null ? first : `${first} ${second}`
}

// "Monday" — the day's own weekday, read in UTC so it stays the stored day
// whatever the viewer's time zone (the same reason as formatShortDate).
function weekdayName(date: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}