import { useQuery } from '@tanstack/react-query'
import { careTeamQueryKey, fetchCareTeam } from './api'

// A patient's care team — current members, or (includeEnded) the whole
// history. Each mode is its own cache entry (see careTeamQueryKey).
export function useCareTeam(patientId: number, includeEnded: boolean) {
  return useQuery({
    queryKey: careTeamQueryKey(patientId, includeEnded),
    queryFn: () => fetchCareTeam(patientId, includeEnded),
  })
}