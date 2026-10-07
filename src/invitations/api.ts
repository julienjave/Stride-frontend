import { apiRequest } from '@/api/client'
import type { InvitationPreview, InvitationSummary, SentInvitation } from './types'

// One cache entry per account: its invitation history. A function, not a
// constant, because the key includes WHICH account — and every place that
// reads or invalidates it must build the exact same array.
export function invitationsQueryKey(userId: number) {
  return ['invitations', 'user', userId] as const
}

// --- MANAGING (admin, or a practitioner on the patient's care team) ---

// Every invitation ever sent to the account, NEWEST FIRST — the first one
// is the current state. An empty list is a normal answer (an account that
// never needed one, like the founding admin's), not an error.
export function listInvitations(userId: number) {
  return apiRequest<InvitationSummary[]>(`/users/${userId}/invitations`)
}

// Closes the open invitation: its link stops working. The account stays
// (with no password, it simply can't be entered); a new invitation can be
// sent later. 404 when there's no open invitation to revoke.
export function revokeInvitation(userId: number) {
  return apiRequest<InvitationSummary>(`/users/${userId}/invitations/revoke`, {
    method: 'POST',
  })
}

// Sends an account a NEW invitation — the first one, or one replacing the
// open one (the backend closes it, so its link stops working). Allowed for
// an admin, or a practitioner on the patient's care team.
export function sendInvitation(userId: number) {
  return apiRequest<SentInvitation>(`/users/${userId}/invitations`, {
    method: 'POST',
  })
}

// --- ACCEPTING (public: the person has no session yet) ---

// The token travels in the request BODY, never in the URL — the backend
// logs every request URL, and a live invitation link must not end up in
// the logs. That's why a lookup (a read) is a POST: a GET has no body.
export function lookupInvitation(token: string) {
  return apiRequest<InvitationPreview>('/invitations/lookup', {
    method: 'POST',
    body: { token },
  })
}

// Sets the account's first password and closes the invitation, in one
// step on the backend (two tabs can't both succeed). 204: nothing to
// return — the person then logs in on the sign-in page.
export function acceptInvitation(values: { token: string; password: string }) {
  return apiRequest<void>('/invitations/accept', {
    method: 'POST',
    body: values,
  })
}