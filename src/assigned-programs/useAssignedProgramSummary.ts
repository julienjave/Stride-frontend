import { useQuery } from '@tanstack/react-query'
import { assignedProgramSummaryQueryKey, fetchAssignedProgramSummary } from './api'

// A program's progress as judged on `today` (the viewer's date, chosen by
// the page). `enabled` lets the page wait until it knows the program can
// be seen at all: no summary request for a program that answered 404.
export function useAssignedProgramSummary(
  id: number,
  today: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: assignedProgramSummaryQueryKey(id, today),
    queryFn: () => fetchAssignedProgramSummary(id, today),
    enabled,
  })
}