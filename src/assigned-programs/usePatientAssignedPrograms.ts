import { useQuery } from '@tanstack/react-query'
import { fetchPatientAssignedPrograms, patientAssignedProgramsQueryKey } from './api'

// One patient's programs, for the practitioner's patient page. A sibling of
// useAssignedPrograms() (the hub's role-scoped list), with its own cache
// entry per patient — see patientAssignedProgramsQueryKey for why its key
// starts with the hub list's.
export function usePatientAssignedPrograms(patientId: number) {
  return useQuery({
    queryKey: patientAssignedProgramsQueryKey(patientId),
    queryFn: () => fetchPatientAssignedPrograms(patientId),
  })
}