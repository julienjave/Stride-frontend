/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

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
