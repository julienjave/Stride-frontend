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

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { conversationQueryKey, conversationsQueryKey, fetchConversation } from './api'
import type { ConversationSummary } from './types'

// One conversation's summary — the thread's header (who, can I write).
//
// Opened from the list, the summary is already in the cache (a row of the
// list): `initialData` hands it over, with the LIST's age
// (`initialDataUpdatedAt`), so a fresh list means no request at all and a
// stale one is refetched as usual. Opened directly (a "Message" button, a
// bookmark), it is fetched — an empty conversation, absent from the list,
// included.
export function useConversation(id: number) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: conversationQueryKey(id),
    queryFn: () => fetchConversation(id),
    initialData: () =>
      queryClient.getQueryData<ConversationSummary[]>(conversationsQueryKey)?.find((c) => c.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(conversationsQueryKey)?.dataUpdatedAt,
  })
}