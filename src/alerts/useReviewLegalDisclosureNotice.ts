import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ALERTS_PREFIX, reviewLegalDisclosureNotice } from './api'

// "Mark as reviewed" on a legal disclosure's notice (decisions §25, pass 3) —
// useReviewComplaintReviewNotice's twin: not optimistic (the server decides
// what a notice is), and every alerts query is stale after it (the row leaves
// the list, the home card's count goes down).
export function useReviewLegalDisclosureNotice(disclosureId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reviewLegalDisclosureNotice(disclosureId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_PREFIX }),
  })
}
