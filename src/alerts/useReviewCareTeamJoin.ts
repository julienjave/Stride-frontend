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