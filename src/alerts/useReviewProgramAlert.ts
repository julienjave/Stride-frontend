import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ALERTS_PREFIX, reviewProgramAlert } from './api'

// "Mark as reviewed" on a program's attendance alert (2026-10-19). Not
// optimistic, like the session review: the server decides what is
// reviewed. After it, every alerts query is stale — the banner disappears
// with the alert, and the home's list no longer has the row.
export function useReviewProgramAlert(programId: number, today: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reviewProgramAlert(programId, today),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_PREFIX }),
  })
}