import { apiRequest } from '@/api/client'
import type { PatientMerge, PatientMergeAnswer } from './types'

// One list for the whole app: a clinic merges rarely, and both screens that
// need merges (the users list's badge, a user page's banner) read it whole.
export const patientMergesQueryKey = ['patient-merges'] as const

export function fetchPatientMerges() {
  return apiRequest<PatientMerge[]>('/patient-merges')
}

// Merges `mergedId` INTO `intoUserId` (the account the admin keeps), after
// the admin's own step-up: their password, and their code when their account
// has two-factor on. The code key is left out when there's no code — the
// backend's DTO refuses an empty one.
export function mergePatients(
  mergedId: number,
  intoUserId: number,
  currentPassword: string,
  mfaCode?: string,
) {
  return apiRequest<PatientMergeAnswer>(`/users/${mergedId}/merge`, {
    method: 'POST',
    body:
      mfaCode === undefined
        ? { intoUserId, currentPassword }
        : { intoUserId, currentPassword, mfaCode },
  })
}
