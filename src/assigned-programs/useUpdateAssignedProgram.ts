import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  assignedProgramQueryKey,
  assignedProgramsListQueryKey,
  updateAssignedProgram,
} from './api'
import type { AssignedProgramDetail, UpdateAssignedProgramInput } from './types'

// PATCH /assigned-programs/:id — the title, the dates and "rearrange the
// week" (allowSwaps). The cache work after it:
//   - the answer IS the full program (a start move's new schedule versions
//     included), so it replaces the cached one directly (setQueryData) — no
//     refetch of the program;
//   - the lists show titles, dates and allowSwaps, so they're marked stale
//     (not awaited: nothing on THIS page reads them for what changed);
//   - when a DATE was sent, the summary and the closing preview are marked
//     stale too, and awaited. Both are judged from the dates: the summary
//     covers start → end (a shorter end drops days, scales a last week); the
//     preview's end date is never later than the program's end
//     (closingEndDate). Their keys sit under the program's —
//     ['assigned-programs', id, 'summary' | 'closing', today] —, so each
//     PREFIX refreshes them for any `today`, without refetching the program
//     just written (invalidating ['assigned-programs', id] would). Awaited,
//     so "Saving…" lasts until the progress below matches the new dates —
//     the field then closes on a page that is already right (the schedule
//     editor's rule, useAddScheduleVersion).
//   - a title or allowSwaps alone changes nothing the summary judges (swaps
//     already recorded keep counting — swap-rules.ts): no refetch for them.
//
// `input` is the second argument TanStack Query passes to onSuccess: the
// variables this call was made with, so the hook knows what was sent.
export function useUpdateAssignedProgram(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAssignedProgramInput) => updateAssignedProgram(id, input),
    onSuccess: async (program: AssignedProgramDetail, input: UpdateAssignedProgramInput) => {
      queryClient.setQueryData(assignedProgramQueryKey(id), program)
      void queryClient.invalidateQueries({ queryKey: assignedProgramsListQueryKey })
      if (input.startDate !== undefined || input.endDate !== undefined) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: [...assignedProgramQueryKey(id), 'summary'] }),
          queryClient.invalidateQueries({ queryKey: [...assignedProgramQueryKey(id), 'closing'] }),
        ])
      }
    },
  })
}