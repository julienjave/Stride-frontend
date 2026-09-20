import { useQuery } from '@tanstack/react-query'
import { fetchAssignedPrograms, assignedProgramsListQueryKey } from './api'

export function useAssignedPrograms() {
  return useQuery({
    queryKey: assignedProgramsListQueryKey,
    queryFn: fetchAssignedPrograms,
  })
}