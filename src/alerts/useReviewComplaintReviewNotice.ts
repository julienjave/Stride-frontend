import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ALERTS_PREFIX, reviewComplaintReviewNotice } from './api'

// "Mark as reviewed" on a complaint review's notice (decisions §25, pass 2) —
// useReviewCareTeamJoin's twin: not optimistic (the server decides what a
// notice is), and every alerts query is stale after it (the row leaves the
// list, the home card's count goes down).
export function useReviewComplaintReviewNotice(reviewId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reviewComplaintReviewNotice(reviewId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_PREFIX }),
  })
}
