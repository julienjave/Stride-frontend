import { failureText } from '@/api/apiErrors'

// The words of a failed LOAD (Phase 6, the load-error pass, 2026-10-28):
// what couldn't be loaded, then WHY — from the same rule as every failed
// action (`failureText`, api/apiErrors.ts, decided 2026-10-27), so a load
// and a save that fail for the same reason say the same thing:
//
//   Couldn't load your patients. Something went wrong on our side. Try again in a moment.
//   Couldn't load your patients. Too many attempts in a short time. Try again in 40 seconds.
//   Couldn't load your patients. Check your connection and try again.
//
// The "why" matters right before the reader presses "Try again": "our side"
// (wait a moment), "your connection" (check it first), or a 429's own wait.
//
// No answer at all (the network dropped): "Check your connection and try
// again." — not failureText's general "Something went wrong. Check your
// connection…": the first sentence has already said what went wrong.
export const LOAD_NO_ANSWER_TEXT = 'Check your connection and try again.'

export function loadErrorText(what: string, error: unknown, again: boolean): string {
  const failed = again ? `Still couldn't load ${what}.` : `Couldn't load ${what}.`
  return `${failed} ${failureText(error, LOAD_NO_ANSWER_TEXT)}`
}