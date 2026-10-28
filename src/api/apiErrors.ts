import { ApiError } from './client'

// Reading the backend's refusals — shared by every form that must tell one
// refusal from another. One status often carries several meanings (a 400
// is a wrong password, a dead link, a field the DTO refused…), so a page
// recognises a refusal by its status AND its exact words: the backend's
// messages are part of its contract, mirrored as constants in each
// feature's rules file.
//
// (Moved here 2026-10-22 from emailChangeRules.ts and passwordResetRules.ts,
// which each had a copy, when changing the password became a third user.)

export function hasMessage(error: unknown, status: number, message: string): boolean {
  return (
    error instanceof ApiError && error.statusCode === status && error.messages.includes(message)
  )
}

// --- The words of a failure: ONE rule for every screen ----------------------
//
// (Decided 2026-10-27 — "plain words for every 429", pass 2.) Before, about
// 55 components each wrote their own `error instanceof ApiError ?
// error.messages.join(', ') : 'Something went wrong'`: two separators, a
// dozen fallbacks, and every 5xx shown as the server's "Internal server
// error". Now every screen asks this function, and a test
// (failureTextConvention.test.ts) fails if a component reads an error's
// messages itself again.
//
// Three cases, decided by what happened:
// - The server REFUSED (a 4xx): its own words. The backend writes them for
//   people — they are part of its contract (a 429 says how long to wait,
//   config/rate-limits.ts) — so they are shown as they are. Several messages
//   (a form the DTO refused on two fields) are joined with a space: each is
//   a sentence of its own.
// - The server FAILED (a 5xx): its words ("Internal server error") help
//   nobody, and may say more than a visitor should read. One plain sentence
//   instead — the request itself may be fine, so "try again".
// - NO ANSWER at all (the network, a timeout, anything thrown that isn't an
//   ApiError): nothing came back to show. The caller may say what failed
//   ("Couldn't upload the photo.") — the reader then knows which action to
//   repeat; without it, a general sentence that points at the connection.
export const SERVER_PROBLEM_TEXT = 'Something went wrong on our side. Try again in a moment.'
export const NO_ANSWER_TEXT = 'Something went wrong. Check your connection and try again.'

export function failureText(error: unknown, noAnswer: string = NO_ANSWER_TEXT): string {
  if (!(error instanceof ApiError)) return noAnswer
  if (error.statusCode >= 500) return SERVER_PROBLEM_TEXT
  return error.messages.join(' ')
}
// A 404: for the four resources row security guards (programs, sessions,
// conversations, medical-file entries), "no such record" AND "a record you
// may not see" — the backend answers both alike on purpose. Pages show
// `NotAvailable` for it (`src/common/`), never "try again": asking again
// can't change the answer.
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 404
}