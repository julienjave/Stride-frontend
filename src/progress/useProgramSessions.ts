import { useQuery } from '@tanstack/react-query'
import { fetchProgramSessions, programSessionsQueryKey } from './api'

// A program's sessions, for its progress charts. `enabled` lets the page
// wait until the program itself has loaded: a program that answered 404
// asks nothing more (the summary's rule — useAssignedProgramSummary).
export function useProgramSessions(programId: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: programSessionsQueryKey(programId),
    queryFn: () => fetchProgramSessions(programId),
    enabled,
  })
}