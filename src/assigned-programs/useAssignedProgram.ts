import { useQuery } from '@tanstack/react-query'
import { assignedProgramQueryKey, fetchAssignedProgram } from './api'

// One program in full — workouts, exercises, schedule versions — for its
// page, and for "Assign again" (the program to continue). The same cache
// entry the assign form fills with its answer (useCreateAssignedProgram),
// so the page opens at once after assigning. (A 404 isn't retried: the
// app's QueryClient gives up at once on 4xx — api/queryClient.ts.)
// `enabled` (default true): the assign-again page skips a link whose id
// isn't a number.
export function useAssignedProgram(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: assignedProgramQueryKey(id),
    queryFn: () => fetchAssignedProgram(id),
    enabled,
  })
}