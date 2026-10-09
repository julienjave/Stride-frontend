import { useQuery } from '@tanstack/react-query'
import { careTeamCandidatesQueryKey, fetchCareTeamCandidates } from './api'

// Who could be added to a patient's care team. `enabled` lets the dialog
// ask only once it's OPEN — nobody needs the list until then.
export function useCareTeamCandidates(patientId: number, enabled: boolean) {
  return useQuery({
    queryKey: careTeamCandidatesQueryKey(patientId),
    queryFn: () => fetchCareTeamCandidates(patientId),
    enabled,
  })
}