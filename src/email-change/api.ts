import { apiRequest } from '@/api/client'

// The backend's change-of-email routes (Phase 6, "Change email" — decisions
// §12), all under /auth/email-change. Self-service only: every call is about
// the signed-in account, or about one of the two emailed links.

// The open request the person can still confirm — the FULL new address: its
// reader is the account's owner, and it's how a typo is spotted. (The old
// inbox is sent it masked; that's another reader.)
export interface PendingEmailChange {
  newEmail: string
  createdAt: string
  expiresAt: string
}

export function fetchPendingEmailChange() {
  return apiRequest<{ pending: PendingEmailChange | null }>('/auth/email-change')
}

// 201 with the pending request — the same answer whether the address is free
// or already an account's (the backend reveals nothing; only the new inbox's
// email differs).
export function requestEmailChange(newEmail: string, currentPassword: string) {
  return apiRequest<{ pending: PendingEmailChange }>('/auth/email-change', {
    method: 'POST',
    body: { newEmail, currentPassword },
  })
}

export function cancelPendingEmailChange() {
  return apiRequest<void>('/auth/email-change', { method: 'DELETE' })
}

// The link sent to the NEW address. The token in the BODY: a URL ends up in
// logs. Answers the address the account now signs in with.
export function confirmEmailChange(token: string) {
  return apiRequest<{ email: string }>('/auth/email-change/confirm', {
    method: 'POST',
    body: { token },
  })
}

// The link sent to the OLD address.
export function cancelEmailChangeByLink(token: string) {
  return apiRequest<void>('/auth/email-change/cancel', {
    method: 'POST',
    body: { token },
  })
}