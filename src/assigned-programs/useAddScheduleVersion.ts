import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  addScheduleVersion,
  assignedProgramQueryKey,
  assignedProgramsListQueryKey,
} from './api'
import type { AssignedProgramDetail, ScheduleVersionInput } from './types'

// A new schedule version — a change, a pause or a resume — and the cache
// work after it:
//   - the answer IS the full program (every version included), so it
//     replaces the cached one directly (setQueryData): the new schedule
//     shows at once, with no second request for the program;
//   - the SUMMARY is now wrong (which days are scheduled, paused, missed
//     depends on the versions), so it's marked stale and refetched. Its key
//     is under the program's — ['assigned-programs', id, 'summary', today]
//     — and invalidating the prefix ['assigned-programs', id, 'summary']
//     refreshes it whatever `today` it was asked with, WITHOUT refetching
//     the program just written (invalidating ['assigned-programs', id]
//     would);
//   - the lists show each program's schedule ("3× a week"), so they're
//     marked stale too.
// AWAITED, so "Saving…" lasts until the progress below matches the new
// schedule — the form then closes on a page that is already right.
export function useAddScheduleVersion(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ScheduleVersionInput) => addScheduleVersion(id, input),
    onSuccess: async (program: AssignedProgramDetail) => {
      queryClient.setQueryData(assignedProgramQueryKey(id), program)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...assignedProgramQueryKey(id), 'summary'] }),
        queryClient.invalidateQueries({ queryKey: assignedProgramsListQueryKey }),
      ])
    },
  })
}