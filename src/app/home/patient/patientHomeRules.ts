import type {
  AssignedProgramListItem,
  ScheduleSummary,
  SessionEndReason,
} from '@/assigned-programs/types'

// The patient home's rules (Phase 4, decisions §2): what each program asks
// of the patient TODAY, and what comes NEXT — read from the backend's
// summary, never worked out from the schedule. The summary has already
// judged every day (due, done, missed…); these functions only PICK what the
// home shows, the same split as programProgress.ts on the practitioner's
// side. Pure: plain values in, plain values out — every rule is a plain
// test (patientHomeRules.test.ts).

// --- WHICH PROGRAMS --------------------------------------------------------------

// The programs the home shows: the ACTIVE ones (a completed or cancelled
// program asks nothing any more; it stays on the record, in the Sessions
// hub later). Several are listed EQUALLY (decisions §2: no "primary"
// program), so the order is plain and stable: the one that started first,
// then by id (two started the same day keep the order they were assigned).
// `filter` returns a new array, so sorting it never touches the cached list.
export function activePrograms(
  programs: readonly AssignedProgramListItem[],
): AssignedProgramListItem[] {
  return programs
    .filter((program) => program.status === 'active')
    .sort((a, b) =>
      a.startDate === b.startDate ? a.id - b.id : a.startDate < b.startDate ? -1 : 1,
    )
}

// --- TODAY -----------------------------------------------------------------------

// What one program asks of the patient today — or null: nothing (a free
// day with nothing to catch up, a program not started yet, or one past its
// end). Each kind carries what its words need:
//   - in_progress — a session of today is open (Resume, with the session flow);
//   - due        — today is a scheduled day, not done yet;
//   - catch_up   — a FREE day inside the make-up window of a missed day
//                  (decided 2026-10-15: make-ups are inferred, so the home
//                  only has to say it — "Catch up: Monday's A · Mobility");
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
  | { kind: 'in_progress'; workoutId: number }
  | { kind: 'due'; workoutId: number; stopped: SessionEndReason[] }
  | { kind: 'catch_up'; workoutId: number; forDay: string; stopped: SessionEndReason[] }
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
// can't be TODAY's state (a day is made up on a LATER day), but listing it
// keeps the set the same as the practitioner page's FULFILLED.
const FULFILLED: ReadonlySet<string> = new Set(['done', 'made_up', 'done_early', 'swapped'])

// In this order — the first that applies wins:
//   1. a session open TODAY (one left open on an earlier day doesn't count:
//      the next start closes it, and the day it belonged to is over);
//   2. a pause covering today — whatever else, nothing is asked;
//   3. today is a scheduled day: done → skipped → due;
//   4. today is inside a weekly count: a slot filled today → met → the next
//      open slot;
//   5. a missed day still in its make-up window (the summary's nextWorkout
//      names a day BEFORE today — it can only do that while the window is
//      open, and only on a free day: a scheduled day closes the window).
export function todayStatus(summary: ScheduleSummary, today: string): TodayStatus | null {
  const open = summary.openSession
  if (open && open.localDate === today) return { kind: 'in_progress', workoutId: open.workoutId }

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
    return { kind: 'catch_up', workoutId: next.workoutId, forDay: next.forDay, stopped }
  }
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

// --- A PROGRAM'S PROGRESS -------------------------------------------------------

// The fraction a progress bar shows: sessions fulfilled (done on the day,
// made up, done early, swapped — the same four totalsText counts as done)
// out of the program's whole target. null for an open-ended program, which
// has no total (decisions §5: a count, not a bar) — and for a target of 0,
// where a bar would divide by zero.
export function progressFraction(
  totals: ScheduleSummary['totals'],
): { fulfilled: number; expected: number } | null {
  if (totals.expected === null || totals.expected === 0) return null
  return {
    fulfilled: totals.done + totals.madeUp + totals.doneEarly + totals.swapped,
    expected: totals.expected,
  }
}