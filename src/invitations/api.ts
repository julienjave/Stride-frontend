import { apiRequest } from '@/api/client'
import type { SentInvitation } from './types'

// Sends an account a NEW invitation — the first one, or one replacing the
// open one (the backend closes it, so its link stops working). Allowed for
// an admin, or a practitioner on the patient's care team.
export function sendInvitation(userId: number) {
  return apiRequest<SentInvitation>(`/users/${userId}/invitations`, {
    method: 'POST',
  })
}