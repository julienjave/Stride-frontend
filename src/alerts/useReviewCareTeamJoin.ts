import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ALERTS_PREFIX, reviewCareTeamJoin } from './api'

// "Mark as reviewed" on a care-team join notice (2026-10-28, decisions §25).
// Not optimistic, like the other reviews: the server decides what a notice is.
// After it, every alerts query is stale — the row leaves the list, and the
// home card's count goes down.
export function useReviewCareTeamJoin(linkId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reviewCareTeamJoin(linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_PREFIX }),
  })
}