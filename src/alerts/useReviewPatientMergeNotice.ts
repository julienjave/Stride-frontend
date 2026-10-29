import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ALERTS_PREFIX, reviewPatientMergeNotice } from './api'

// "Mark as reviewed" on a patient merge's notice (decisions §27, pass 4):
// the legal disclosure notice's hook again — the list is asked for afresh
// afterwards, so the row leaves because the SERVER says it's reviewed.
export function useReviewPatientMergeNotice(mergeId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reviewPatientMergeNotice(mergeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_PREFIX }),
  })
}
