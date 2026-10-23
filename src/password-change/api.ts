import { apiRequest } from '@/api/client'

// The backend's change-of-password route (Phase 6, "Change password" —
// decisions §13). About the signed-in account only; both passwords in the
// BODY (a URL ends up in logs). 204: nothing to answer — this browser stays
// signed in; every other session of the account has ended.
export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<void>('/auth/password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  })
}