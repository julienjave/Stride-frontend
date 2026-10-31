import type { SessionExercise } from '../types'

// The session timer's rules (Phase 7, decided with the person 2026-10-31):
// a HOLD countdown for an exercise with a prescribed duration, one hold per
// set, and a STOPWATCH for an exercise without one. A helper on screen only:
// nothing is recorded (decisions §5.9 stands — the app's timer, which the
// patient may not use, is not a clinical measurement).
//
// Pure: plain values in, plain values out (timerRules.test.ts). Time comes IN
// as a number of milliseconds (`now`) from a monotonic clock —
// `performance.now()` in the app — never read here. Two reasons:
//   1. a test chooses the time, so "19.2 seconds into set 2" is one line;
//   2. a monotonic clock never jumps: the wall clock (`Date.now()`) moves when
//      the phone corrects its time or the user changes it, and a hold would
//      suddenly end, or last an hour.
//
// The time left is CALCULATED from when the hold started, never counted down
// by a timer ticking each second: browsers slow timers in a background tab (to
// once a second, or once a minute), so a ticked count would fall behind; a
// calculated one is right the moment it's read again.

// --- The hold countdown -------------------------------------------------------

// What the prescription asks for: hold for `holdMs`, `sets` times. A duration
// without sets is one hold. Nothing to time → null: the stopwatch instead —
// no duration, 0 (the prescription summary doesn't show a 0 either), or below
// 0: the backend's DTOs refuse a duration under 1 second, but the database has
// no CHECK on it, so a row written another way could hold one, and a negative
// countdown would be "done" before it starts.
export interface HoldPlan {
  holdMs: number
  sets: number
}

export function holdPlan(
  exercise: Pick<SessionExercise, 'durationInSeconds' | 'sets'>,
): HoldPlan | null {
  const seconds = exercise.durationInSeconds
  if (seconds === null || seconds <= 0) return null
  const sets = exercise.sets ?? 0
  return { holdMs: seconds * 1000, sets: sets > 0 ? sets : 1 }
}

// The countdown's four states. `set` counts from 1 (what the screen says: "Set
// 2 of 3").
//
//   ready(1) ──Start──► running ──Pause──► paused ──Resume──► running …
//                          │  ▲                │
//                          │  └─────Reset──────┘ (both back to ready, same set)
//                          ▼ (time's up)
//               ready(set + 1)  or, after the last set,  all_done
//
// `running` keeps WHEN it started (`since`) and how much of this hold was
// already held before a pause (`heldBefore`), not a "time left" that would
// need updating. `paused` keeps only how much was held.
export type HoldState =
  | { phase: 'ready'; set: number }
  | { phase: 'running'; set: number; since: number; heldBefore: number }
  | { phase: 'paused'; set: number; held: number }
  | { phase: 'all_done' }

export const HOLD_START: HoldState = { phase: 'ready', set: 1 }

// How much of the current hold has been held at `now`, in milliseconds.
export function heldMs(state: HoldState, now: number): number {
  switch (state.phase) {
    case 'running':
      // Never negative, even if a caller passes a `now` from before `since`.
      return state.heldBefore + Math.max(0, now - state.since)
    case 'paused':
      return state.held
    default:
      return 0
  }
}

// What's left of the current hold, never below 0. After the last set, 0.
export function remainingMs(state: HoldState, plan: HoldPlan, now: number): number {
  if (state.phase === 'all_done') return 0
  return Math.max(0, plan.holdMs - heldMs(state, now))
}

// The ONE button that moves the timer on — Start, Pause, Resume, "Start set 2",
// "Start over" — pressed at `now`. One button whose words change, not several
// buttons in turn, so keyboard focus stays on it (a button removed from the
// page takes focus with it, to the top of the page).
export function pressMain(state: HoldState, now: number): HoldState {
  switch (state.phase) {
    case 'ready':
      return { phase: 'running', set: state.set, since: now, heldBefore: 0 }
    case 'running':
      return { phase: 'paused', set: state.set, held: heldMs(state, now) }
    case 'paused':
      return { phase: 'running', set: state.set, since: now, heldBefore: state.held }
    case 'all_done':
      return HOLD_START
  }
}

// Reset: the current hold starts again (the patient lost the position, say) —
// the sets already held stay held. Only while a hold is running or paused;
// otherwise there's nothing to reset and the state is returned as it is.
export function resetHold(state: HoldState): HoldState {
  if (state.phase === 'running' || state.phase === 'paused') {
    return { phase: 'ready', set: state.set }
  }
  return state
}

// Is the running hold over at `now`? Then the next set waits for the
// patient's Start (no rest timer: the prescription has no rest time — the
// person chose not to add one), or, after the last set, it's all done.
// Otherwise the state is returned unchanged — the SAME object, so React sees
// no change and draws nothing new.
export function advance(state: HoldState, plan: HoldPlan, now: number): HoldState {
  if (state.phase !== 'running' || remainingMs(state, plan, now) > 0) return state
  return state.set < plan.sets ? { phase: 'ready', set: state.set + 1 } : { phase: 'all_done' }
}

// What just happened between two states, for the sound and the screen
// reader's announcement — or nothing worth saying. Decided from the two
// states, not by the code that changed them, so a hold that ended while the
// tab was in the background is announced the same way when it's read again.
export type HoldEvent = 'started' | 'paused' | 'resumed' | 'reset' | 'set_done' | 'all_done'

export function holdEvent(before: HoldState, after: HoldState): HoldEvent | null {
  if (before === after) return null
  if (after.phase === 'all_done') return before.phase === 'running' ? 'all_done' : null
  if (after.phase === 'running') return before.phase === 'paused' ? 'resumed' : 'started'
  if (after.phase === 'paused') return 'paused'
  // after = ready. From a running hold, either its time was up (the next set)
  // or Reset (the same set). Those are the only two ways, so `!==` would read
  // the same as `=== + 1` (a mutation test confirms the two are equivalent);
  // the `+ 1` says what a set ending IS.
  if (before.phase === 'running' && after.set === before.set + 1) return 'set_done'
  if (before.phase === 'running' || before.phase === 'paused') return 'reset'
  return null
}

// Keep the phone's screen on? While a hold counts, and in the gap between two
// sets (a phone locks after ~30 s, about the time a patient catches their
// breath). Not when paused — the patient chose to stop — nor before the first
// set or after the last.
export function holdKeepsScreenOn(state: HoldState): boolean {
  return state.phase === 'running' || (state.phase === 'ready' && state.set > 1)
}

// --- The stopwatch ------------------------------------------------------------

// Counting up: running since `since` (null = stopped), plus what was counted
// before the last pause. 0 / null = never started, or reset.
export interface StopwatchState {
  since: number | null
  countedBefore: number
}

export const STOPWATCH_START: StopwatchState = { since: null, countedBefore: 0 }

export function stopwatchMs(state: StopwatchState, now: number): number {
  return state.since === null
    ? state.countedBefore
    : state.countedBefore + Math.max(0, now - state.since)
}

// Start / Pause / Resume — one button, as for the hold.
export function pressStopwatch(state: StopwatchState, now: number): StopwatchState {
  return state.since === null
    ? { since: now, countedBefore: state.countedBefore }
    : { since: null, countedBefore: stopwatchMs(state, now) }
}

// --- Showing time ------------------------------------------------------------

// A clock face, "m:ss" ("0:20", "12:05"), "h:mm:ss" from an hour.
// Whole seconds, rounded the way each timer needs:
//   - a COUNTDOWN rounds UP: it shows "0:20" for the whole first second, and
//     "0:00" only when the hold is over — "0:00" while still holding would say
//     "done" a second early;
//   - a STOPWATCH rounds DOWN, as every stopwatch does: "0:01" once a full
//     second has passed.
export function clockText(ms: number, rounding: 'up' | 'down'): string {
  const total = rounding === 'up' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}` : `${minutes}:${ss}`
}

// The same amount in words, for screen readers and sentences ("1 minute 30
// seconds") — a screen reader reads "1:30" as "one thirty", a time of day.
export function durationWords(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const parts: string[] = []
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
  if (seconds > 0 || minutes === 0) parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`)
  return parts.join(' ')
}