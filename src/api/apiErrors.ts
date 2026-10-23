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

// What to show for any other failure: the server's words (a 429 says "too
// many requests…"), or a plain sentence when there was no answer at all
// (the network).
export function failureText(error: unknown): string {
  return error instanceof ApiError
    ? error.messages.join(' ')
    : 'Something went wrong. Check your connection and try again.'
}