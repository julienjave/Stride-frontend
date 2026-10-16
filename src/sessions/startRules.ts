import type {
  AssignedProgramExercise,
  OpenSession,
  ScheduleSummary,
} from '@/assigned-programs/types'
import { todayStatus, type TodayStatus } from './todayStatus'

// What the session flow can do for one program TODAY — read from the same
// rule the home uses (todayStatus), so the home's button and the start page
// can never disagree about which workout today asks for. Pure (startRules.test.ts).

// The three kinds of "today" a session can be STARTED for:
//   - due      — a scheduled day: its own workout;
//   - catch_up — a free day inside a missed day's make-up window: the
//                MISSED day's workout (the backend infers the make-up —
//                nothing else is sent, decided 2026-10-15);
//   - weekly   — an "N a week" program: the next open slot's workout.
export type StartableStatus = Extract<TodayStatus, { kind: 'due' | 'catch_up' | 'weekly' }>

export type StartChoice =
  // Start this workout (the status says why it's today's).
  | { kind: 'start'; workoutId: number; status: StartableStatus }
  // A session of today is already open: go back to it.
  | { kind: 'resume'; sessionId: number }
  // Nothing to start: done, the week met, skipped, paused — or nothing
  // asked today at all (null).
  | { kind: 'none'; status: Exclude<TodayStatus, StartableStatus | { kind: 'in_progress' }> | null }

export function startChoice(summary: ScheduleSummary, today: string): StartChoice {
  const status = todayStatus(summary, today)
  if (status === null) return { kind: 'none', status: null }
  switch (status.kind) {
    case 'due':
    case 'catch_up':
    case 'weekly':
      return { kind: 'start', workoutId: status.workoutId, status }
    case 'in_progress':
      return { kind: 'resume', sessionId: status.sessionId }
    default:
      return { kind: 'none', status }
  }
}

// A session left OPEN on an earlier day (decided 2026-10-16): it can no
// longer be finished — completing happens on a session's own day — and the
// program's next Start closes it as "not finished". No Resume for it; the
// home says it in one sentence. Null when there's none. (todayStatus
// ignores it on purpose: the day it belonged to is over.)
export function sessionLeftOpen(summary: ScheduleSummary, today: string): OpenSession | null {
  const open = summary.openSession
  return open !== null && open.localDate < today ? open : null
}

// The exercises a session of this workout will hold, in order: the
// program's ACTIVE exercises of that workout (retired ones are apart, in
// `retiredExercises`, and never join a new session — step 3b-0). The
// program lists its exercises workout by workout, each in its own order;
// sorting by sortOrder keeps this right even if that changed.
export function workoutExercises(
  exercises: readonly AssignedProgramExercise[],
  workoutId: number,
): AssignedProgramExercise[] {
  return exercises
    .filter((exercise) => exercise.workoutId === workoutId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
// Can today's session of this program be SKIPPED (pass (c))? Only when today
// is a scheduled day still due — the backend's own rule: a skip exists only
// on a scheduled day of a specific-days schedule (nothing is "due" on a
// given day of an "N a week" program, a catch-up day, or a pause), and never
// once the day has a session. The same rule as the home's due rows, so the
// home's "Skip today" and this page agree. The workout is the day's.
export function skippableWorkout(summary: ScheduleSummary, today: string): number | null {
  const status = todayStatus(summary, today)
  return status?.kind === 'due' ? status.workoutId : null
}