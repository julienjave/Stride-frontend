import { apiRequest } from '@/api/client'
import type { InvitationPreview, SentInvitation } from './types'

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