import type { LateMakeUp, ScheduleSummary, SessionEndReason } from '@/assigned-programs/types'

// What one program asks of the patient TODAY — read from the backend's
// summary, never worked out from the schedule: the summary has already
// judged every day (due, done, missed…); this only PICKS. Pure: plain
// values in, plain values out (todayStatus.test.ts).
//
// Moved here from the patient home's rules (src/app/home/patient/) on
// 2026-10-16, when the session flow's start page became its second reader:
// the home says what today asks, the start page starts exactly that — one
// rule, so the two can never disagree. A rule shared by two features lives
// with the feature it is about (sessions), not inside one of its readers.

// --- TODAY -----------------------------------------------------------------------

// What one program asks of the patient today — or null: nothing (a free
// day with nothing to catch up, a program not started yet, or one past its
// end). Each kind carries what its words need:
//   - in_progress — a session of today is open: Resume it (its id);
//   - due        — today is a scheduled day, not done yet;
//   - catch_up   — a FREE day inside the make-up window of a missed day
//                  (decided 2026-10-15: make-ups are inferred, so the home
//                  only has to say it — "Catch up: Monday's A · Mobility");
//   - late_make_up — a FREE day on which a missed day whose window has
//                  CLOSED can still be made up late (decided 2026-10-16,
//                  opt-in per program): the OLDEST such day — the one most
//                  at risk of running out — with the last day it can be
//                  done on (`until`);
//   - weekly     — an "N a week" program whose current week still needs some;
//   - done       — today's session is done (on the day, ahead of time, or by
//                  a swap; or a weekly slot filled today);
//   - week_met   — the week's target is already reached;
//   - skipped    — the patient said "not today" (with their reason);
//   - paused     — nothing is due while the program is paused.
// `stopped`: the reasons of sessions STOPPED earlier today (oldest first) —
// they don't count, and the day is still to do, but the patient should see
// the home remembers ("Stopped earlier today (pain)").
export type TodayStatus =
  | { kind: 'in_progress'; workoutId: number; sessionId: number }
  | { kind: 'due'; workoutId: number; stopped: SessionEndReason[] }
  | { kind: 'catch_up'; workoutId: number; forDay: string; stopped: SessionEndReason[] }
  | {
      kind: 'late_make_up'
      workoutId: number
      forDay: string
      until: string
      stopped: SessionEndReason[]
    }
  | {
      kind: 'weekly'
      workoutId: number
      done: number
      target: number
      start: string
      end: string
      stopped: SessionEndReason[]
    }
  | { kind: 'done' }
  | { kind: 'week_met'; target: number }
  | { kind: 'skipped'; reason: SessionEndReason }
  | { kind: 'paused' }

// A scheduled day's states that mean "what the day asked is done". Made up
// (on time or late) can't be TODAY's state (a day is made up on a LATER
// day), but listing them keeps the set the same as the practitioner page's
// FULFILLED.
const FULFILLED: ReadonlySet<string> = new Set([
  'done',
  'made_up',
  'made_up_late',
  'done_early',
  'swapped',
])

// In this order — the first that applies wins:
//   1. a session open TODAY (one left open on an earlier day doesn't count:
//      the next start closes it, and the day it belonged to is over);
//   2. a pause covering today — whatever else, nothing is asked;
//   3. today is a scheduled day: done → skipped → due;
//   4. today is inside a weekly count: a slot filled today → met → the next
//      open slot;
//   5. a missed day still in its make-up window (the summary's nextWorkout
//      names a day BEFORE today — it can only do that while the window is
//      open, and only on a free day: a scheduled day closes the window) —
//      'done' instead when a session was already completed today;
//   6. a missed day that can still be made up LATE — only when the summary
//      says nothing blocks it today (`blockedToday` null): the backend
//      already checked a free day and no session completed today. Never
//      worked out here — POST /sessions refuses what the summary doesn't
//      offer, so the button can only offer what the backend accepts.
//      AFTER 5: with an on-time catch-up open too, the home suggests that
//      one (it's the one whose window closes first) — a suggestion only:
//      the late one is still allowed today (changed 2026-10-17), and the
//      Sessions hub will offer both. lateMakeUpWaiting says it's there.
export function todayStatus(summary: ScheduleSummary, today: string): TodayStatus | null {
  const open = summary.openSession
  if (open && open.localDate === today) {
    return { kind: 'in_progress', workoutId: open.workoutId, sessionId: open.sessionId }
  }

  // A pause covers today when it started on or before it and hasn't ended
  // before it (to: null = nothing ends it).
  if (summary.pauses.some((pause) => pause.from <= today && (pause.to === null || pause.to >= today))) {
    return { kind: 'paused' }
  }

  const stopped = stoppedToday(summary, today)

  const day = summary.days.find((scheduled) => scheduled.date === today)
  if (day) {
    if (FULFILLED.has(day.state)) return { kind: 'done' }
    const skip = day.attempts.find((attempt) => attempt.status === 'skipped')
    if (skip) return { kind: 'skipped', reason: skip.endReason }
    if (day.state === 'due') return { kind: 'due', workoutId: day.workoutId, stopped }
    // 'missed' and 'upcoming' can't be today's state (today is never missed
    // yet, never upcoming); nothing to show rather than a guess.
    return null
  }

  // A stretch containing today is either 'met' or 'in_progress' — never
  // 'upcoming' (it would start later) nor 'missed' (it would have ended).
  const week = summary.weeks.find((stretch) => stretch.start <= today && today <= stretch.end)
  if (week) {
    if (week.workouts.some((slot) => slot.date === today)) return { kind: 'done' }
    // A stretch scaled down to a target of 0 (a short last week: 3 a week
    // over 1 day rounds to 0) asks for nothing — the summary calls it met,
    // but "this week's 0 sessions are done" would be nonsense.
    if (week.target === 0) return null
    if (week.state === 'met') return { kind: 'week_met', target: week.target }
    // In progress: fewer done than the target, so an open slot exists. The
    // check only satisfies the type (find can return undefined).
    const next = week.workouts.find((slot) => slot.sessionId === null)
    if (!next) return null
    return {
      kind: 'weekly',
      workoutId: next.workoutId,
      done: week.done,
      target: week.target,
      start: week.start,
      end: week.end,
      stopped,
    }
  }

  // `< today`, though `<= today` would answer the same: nextWorkout names
  // today only when today is a scheduled day — answered above (a mutation
  // check confirmed it). `<` says what is meant: an EARLIER day.
  const next = summary.nextWorkout
  if (next && next.forDay !== null && next.forDay < today) {
    // A session already COMPLETED today (on this free day) used the day up:
    // one session a day, so the catch-up waits for another free day of its
    // window — offering Start would only meet the backend's 409. Found in
    // the live check (2026-10-17): a late make-up done today, with an
    // on-time catch-up still open, left "you can still make it up today".
    // (Not new — an extra session on a free day did the same.) The summary
    // says it in `lateMakeUps.blockedToday`, computed for every program,
    // with late make-ups allowed or not.
    if (summary.lateMakeUps.blockedToday === 'session_done_today') return { kind: 'done' }
    return { kind: 'catch_up', workoutId: next.workoutId, forDay: next.forDay, stopped }
  }

  const { days: lateDays, blockedToday } = summary.lateMakeUps
  // `days` is oldest first (the backend's order): [0] is the oldest.
  const oldest = lateDays[0]
  if (oldest && blockedToday === null) {
    return { kind: 'late_make_up', ...oldest, stopped }
  }
  return null
}

// Late make-ups the home MENTIONS without a button (decided 2026-10-16:
// the patient should know they're there, and that they won't wait
// forever): the oldest, how many in all, and whether one could be done
// today too (`alsoToday`). Two cases:
//   - today is blocked (`blockedToday`: a scheduled day, a session already
//     done today) — alsoToday false: "on another free day";
//   - today's row is an on-time catch-up — alsoToday true: the late ones
//     are allowed today as well, the home just suggests the catch-up
//     first (changed 2026-10-17: a suggestion, not a rule).
// Null when there's none, or when the row itself offers one (todayStatus's
// late_make_up), or with a session in progress (it may BE the make-up).
export function lateMakeUpWaiting(
  summary: ScheduleSummary,
  status: TodayStatus | null,
): { oldest: LateMakeUp; count: number; alsoToday: boolean } | null {
  const { days, blockedToday } = summary.lateMakeUps
  const oldest = days[0]
  if (!oldest) return null
  if (blockedToday !== null) return { oldest, count: days.length, alsoToday: false }
  if (status?.kind === 'catch_up') return { oldest, count: days.length, alsoToday: true }
  return null
}

// The reasons of the sessions STOPPED today, wherever the summary filed
// them: on today's scheduled day, in today's weekly count, or apart (a free
// day). Skips are left out — a skip is its own status above. (Today that
// filter changes nothing — a skip exists only on a scheduled day, answered
// as 'skipped' before this list is read; a mutation check confirmed it —
// but it keeps the function meaning what its name says.)
function stoppedToday(summary: ScheduleSummary, today: string): SessionEndReason[] {
  const day = summary.days.find((scheduled) => scheduled.date === today)
  const onDay = day ? day.attempts : []
  const dated = [
    ...summary.weeks.flatMap((stretch) => stretch.attempts),
    ...summary.otherAttempts,
  ].filter((attempt) => attempt.date === today)
  return [...onDay, ...dated]
    .filter((attempt) => attempt.status === 'incomplete')
    .map((attempt) => attempt.endReason)
}