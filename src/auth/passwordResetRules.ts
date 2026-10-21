import { ApiError } from '@/api/client'

// The password reset pages' small rules (Phase 6, 2026-10-21), pure and
// tested on their own (passwordResetRules.test.ts).

// The backend's one refusal for a dead link — never issued, used, replaced
// by a newer request, expired — the same from the check and from the reset
// (auth.service.ts, INVALID_RESET_LINK_MESSAGE). Mirrored to TELL IT APART
// from the reset's other 400s (a password the DTO refuses): the page swaps
// to "This link can't be used" only for this one.
export const DEAD_LINK_MESSAGE = 'This password reset link is invalid or has expired'

export function isDeadLink(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.statusCode === 400 &&
    error.messages.includes(DEAD_LINK_MESSAGE)
  )
}

// The words of any other failure, for the form: the backend's own (a 429
// says "too many requests…"), else a generic line (a network failure).
export function failureText(error: unknown): string {
  return error instanceof ApiError
    ? error.messages.join(' ')
    : 'Something went wrong. Check your connection and try again.'
}

// An email carried in navigation state (sign-in → forgot → sign-in, and the
// reset page → sign-in). State, not the URL: an address in a query string
// lands in browser history and server logs. Anything else → ''.
export function readEmail(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'email' in state) {
    return typeof state.email === 'string' ? state.email : ''
  }
  return ''
}

// "14:05" / "2:05 PM" — the link's last moment, in the viewer's own clock
// and locale (it lives one hour, so the time is what matters).
export function formatLinkExpiry(expiresAt: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(expiresAt),
  )
}