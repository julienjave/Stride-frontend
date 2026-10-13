import { useQuery } from '@tanstack/react-query'
import { fetchPatientAssignedPrograms, patientAssignedProgramsQueryKey } from './api'

// One patient's programs, for the practitioner's patient page — and for the
// program page, which reads who assigned a program and which programs it
// continues from it. A sibling of useAssignedPrograms() (the hub's
// role-scoped list), with its own cache entry per patient — see
// patientAssignedProgramsQueryKey for why its key starts with the hub list's.
// `enabled` (default true): the program page asks only once it knows the
// patient (the program has loaded) — the same switch as useUser's.
export function usePatientAssignedPrograms(
  patientId: number,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: patientAssignedProgramsQueryKey(patientId),
    queryFn: () => fetchPatientAssignedPrograms(patientId),
    enabled,
  })
}