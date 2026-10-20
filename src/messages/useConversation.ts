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