import { apiRequest } from '@/api/client'
import { careTeamQueryKey } from '@/patients/api'
import type { MyCareTeamEntry } from './types'

// The patient's own care team, WITH its history (?includeEnded=true): the
// Team page shows the current members and, behind a switch, the past ones —
// one request for both. The key is the practitioner side's own
// (['care-team', patientId, true]) because it IS the same resource at the
// same URL: one cache entry per answer, and invalidating ['care-team', id]
// (what every care-team change does) refreshes this one too.
export function myCareTeamQueryKey(patientId: number) {
  return careTeamQueryKey(patientId, true)
}

export function fetchMyCareTeam(patientId: number) {
  return apiRequest<MyCareTeamEntry[]>(`/users/${patientId}/care-team?includeEnded=true`)
}