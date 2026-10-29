import { useQuery } from '@tanstack/react-query'
import { fetchPatientMerges, patientMergesQueryKey } from './api'

// Every merge (admins). `enabled`: the users list and user page are admin
// pages, but a hook can't be called conditionally — a caller that has no
// use for it passes false.
export function usePatientMerges(enabled = true) {
  return useQuery({
    queryKey: patientMergesQueryKey,
    queryFn: fetchPatientMerges,
    enabled,
  })
}
