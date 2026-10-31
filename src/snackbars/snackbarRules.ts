// The snackbars' RULES, as pure functions (Phase 7, decisions §33): how long
// one stays, and what the list becomes when one more arrives. No React, no
// timers, no store here — so each rule is tested with plain values, and the
// store (snackbarStore.ts) and the component (Snackbars.tsx) only apply them.
//
// What a snackbar is FOR in Stride (the person's choice, 2026-10-31):
//   - a CONFIRMATION of something done ("Entry added.", "Session finished.");
//   - a FAILURE that has no place on screen (the settings menu has closed).
// NOT for a form's or a field's refusal (said next to the field —
// failureText) nor for a load error (LoadError + Try again): those belong
// where the person is looking.

export type SnackbarKind = 'success' | 'failure'

export interface Snackbar {
  // A number given by the store, unique for the page's lifetime: React's
  // `key` for the row, and how the close button names which one to close.
  id: number
  kind: SnackbarKind
  text: string
  // false once closed (timer, Close, Escape, swipe). The row stays in the
  // list a little longer so Radix can play its closing animation — a row
  // REMOVED from the tree at once would just vanish. Closed rows are dropped
  // the next time one is added (addSnackbar).
  open: boolean
}

// At most this many on screen at once (the person's default: 3). A fourth
// pushes one out — see addSnackbar for which.
export const MAX_SNACKBARS = 3

// How long a SUCCESS stays: 5 seconds for a short sentence, more for a
// longer one, never more than 10.
//
// Why it grows with the text: a fixed time is too short for "Your password
// is changed. Any other devices signed in to your account are signed out."
// and needlessly long for "Entry added.". A common reading-speed guide is
// about 200 words a minute; a word is ~6 characters with its space, so
// ~1,200 characters a minute = 50 ms per character. Plus a fixed 2 seconds
// to notice that something appeared at all.
//
// The time is only the DEFAULT: Radix pauses it while the pointer is over
// the snackbars, while one has keyboard focus, and while the window has
// lost focus (another tab or app) — so a snackbar never runs out unseen.
export const SUCCESS_MIN_MS = 5_000
export const SUCCESS_MAX_MS = 10_000
const NOTICE_MS = 2_000
const PER_CHARACTER_MS = 50

// A failure never closes by itself (the person's choice): it says something
// went WRONG, and must not disappear before it was read. Radix treats
// Infinity as "no timer" (checked in its source: `duration === Infinity`
// starts none).
export function snackbarDuration(kind: SnackbarKind, text: string): number {
  if (kind === 'failure') return Infinity
  const reading = NOTICE_MS + text.length * PER_CHARACTER_MS
  // clamp: Math.min / Math.max keep the value inside [MIN, MAX].
  return Math.min(SUCCESS_MAX_MS, Math.max(SUCCESS_MIN_MS, reading))
}

// The list after one more snackbar arrives. Three rules, in this order:
//
// 1. Closed rows go. Their animation has long finished by the time a NEW
//    snackbar comes; keeping them would only grow the list forever.
// 2. The same message again REPLACES the old one rather than stacking a
//    copy: pressing a failing switch three times gives one "Couldn't
//    save…", not three. The new row is put at the end (the newest place) so
//    its timer starts again and it's the one announced.
// 3. Over the limit, the OLDEST SUCCESS among the earlier rows leaves first —
//    a failure stays until the person closes it (rule above), so it isn't
//    pushed out while a success could be. Only if every earlier row is a
//    failure does the oldest failure go: an endless list would cover the
//    page. The NEW row is never the one pushed out — it's what just
//    happened, and with three failures on screen a new success would
//    otherwise be dropped the moment it arrived.
export function addSnackbar(
  list: readonly Snackbar[],
  next: Snackbar,
  max: number = MAX_SNACKBARS,
): Snackbar[] {
  const earlier = list.filter(
    (row) => row.open && !(row.kind === next.kind && row.text === next.text),
  )
  while (earlier.length > max - 1) {
    const oldestSuccess = earlier.findIndex((row) => row.kind === 'success')
    // findIndex gives -1 when there is none: then the first (oldest) row.
    earlier.splice(oldestSuccess === -1 ? 0 : oldestSuccess, 1)
  }
  return [...earlier, next]
}

// The list after one is closed: the row is kept, marked closed (for the
// animation — see `open` above). An id that isn't there changes nothing.
export function closeSnackbarIn(list: readonly Snackbar[], id: number): Snackbar[] {
  return list.map((row) => (row.id === id ? { ...row, open: false } : row))
}