import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  assignedProgramQueryKey,
  assignedProgramsListQueryKey,
  updateAssignedProgram,
} from './api'
import type { AssignedProgramDetail, UpdateAssignedProgramInput } from './types'

// PATCH /assigned-programs/:id. The answer IS the full program, so it
// replaces the cached one directly (setQueryData) — no refetch. The lists
// carry the same fields (allowSwaps among them), so they're marked stale.
// The summary isn't touched: none of these fields changes how a day is
// judged (swaps already recorded keep counting — swap-rules.ts).
export function useUpdateAssignedProgram(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAssignedProgramInput) => updateAssignedProgram(id, input),
    onSuccess: (program: AssignedProgramDetail) => {
      queryClient.setQueryData(assignedProgramQueryKey(id), program)
      void queryClient.invalidateQueries({ queryKey: assignedProgramsListQueryKey })
    },
  })
}