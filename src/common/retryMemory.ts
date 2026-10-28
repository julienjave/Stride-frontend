// The last "Try again" press, remembered OUTSIDE any component — shared by
// the two things that may appear once its answer comes back (Phase 6, the
// load-error pass, 2026-10-28; before, this lived inside LoadError.tsx and
// served only the first of them):
//
// - the retry FAILED: a new LoadError replaces the one that was pressed. It
//   says "Still couldn't …" and takes keyboard focus (LoadError.tsx);
// - the retry WORKED: the content replaces the error. Its heading takes
//   keyboard focus (useRetryFocus.ts), so a keyboard or screen-reader user
//   lands on what just appeared instead of at the top of the page.
//
// WHY OUTSIDE A COMPONENT: when a request never succeeded, TanStack Query
// puts it back to "pending" for the retry (query-core's `fetchState`: no
// data → `status: 'pending'`). The page shows its loading state, and the
// pressed LoadError UNMOUNTS — its state and refs with it — long before the
// answer exists. A module variable outlives both.
//
// WHY IT'S SAFE: it can only reach what replaces the pressed block. It is
// matched by `what` (the words both sides use: "this program"), forgotten
// after 30 seconds, and spent once taken. A press on page A can't make page
// B say "Still", or move focus on a page opened later.
//
// The ORDER of events isn't fixed. When the retry's answer arrives, TanStack
// Query tells the page (which re-renders: the new block or the content
// mounts) and resolves the refetch's promise (LoadError's `.then` runs) —
// React may render before or after that `.then`. So each side works in
// either order: whatever mounts takes the memory if it's still there; the
// `.then` only records the outcome, and only if nobody took it yet.

export interface RetryPress {
  what: string
  at: number
  // 'waiting': no answer yet — or the answer was a failure that the block
  // which replaces the pressed one hasn't picked up yet.
  // 'worked': the answer came back fine; only the content's heading may
  // take it — a LoadError for the same `what` later must NOT say "Still".
  outcome: 'waiting' | 'worked'
}

const MEMORY_MS = 30_000

let last: RetryPress | null = null

function current(what: string): RetryPress | null {
  if (last === null || last.what !== what || Date.now() - last.at >= MEMORY_MS) return null
  return last
}

// Called by "Try again", before asking again. A newer press replaces an
// older one (there is only ever one block being retried at a time).
export function rememberRetry(what: string): RetryPress {
  last = { what, at: Date.now(), outcome: 'waiting' }
  return last
}

// The retry's answer, from the pressed block's `.then` (which runs even if
// that block is gone).
// - Someone already took it (the content or a new block mounted first), or
//   a newer press replaced it: nothing to do — `last` isn't this press.
// - Worked: kept, marked 'worked', for the content's heading.
// - Failed while the pressed block is STILL shown (the request had data, so
//   it stayed in error and the block stayed): it has said "Still …" in
//   place already; nobody comes for the memory — forget it.
// - Failed with the block gone: kept as 'waiting' for the block that will
//   replace it.
export function retryAnswered(press: RetryPress, worked: boolean, pressedStillShown: boolean) {
  if (last !== press) return
  if (worked) press.outcome = 'worked'
  else if (pressedStillShown) last = null
}

// For a LoadError being created: does it replace a block whose retry failed?
// A pure READ — it runs in a useState initialiser, which React may call twice
// (StrictMode); `forgetRetry` spends it, from an effect.
export function isFailedRetry(what: string): boolean {
  const press = current(what)
  return press !== null && press.outcome === 'waiting'
}

// For content that just appeared: did a "Try again" for it just work? Spends
// the memory. Either outcome counts: the content being there IS the proof the
// retry worked, even if its `.then` hasn't run yet. Called from an effect.
export function takeWorkedRetry(what: string): boolean {
  if (current(what) === null) return false
  last = null
  return true
}

export function forgetRetry(what: string) {
  if (current(what) !== null) last = null
}