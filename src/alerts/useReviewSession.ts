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
import { ALERTS_PREFIX, reviewSession, staffSessionQueryKey } from './api'

// "Mark as reviewed". NOT optimistic: the review is a record with a moment
// the server writes — the page says "Saving…" for the instant it takes,
// then shows the review as the server stored it.
//
// After it:
//   - the answer (the session WITH the new review) goes straight into the
//     page's cache entry — no second request;
//   - every alerts query is marked stale (the prefix), so the home's For review
//     list no longer has this session when the practitioner goes back.
export function useReviewSession(sessionId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reviewSession(sessionId),
    onSuccess: async (session) => {
      queryClient.setQueryData(staffSessionQueryKey(sessionId), session)
      await queryClient.invalidateQueries({ queryKey: ALERTS_PREFIX })
    },
  })
}