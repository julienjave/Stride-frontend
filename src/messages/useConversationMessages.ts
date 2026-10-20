import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchMessagesPage, messagesQueryKey } from './api'
import { olderPageParam } from './messageRules'

// A thread, a page at a time — an INFINITE query: TanStack Query keeps the
// pages in one cache entry, `fetchNextPage()` asks for the next one with the
// param `getNextPageParam` computed from the last page fetched.
//
// Here "next" means OLDER: page 0 is the newest (no `before`), and each
// further page asks for the messages before the oldest one loaded
// (olderPageParam). threadMessages() turns the pages into one list, oldest
// first. New messages are appended to page 0 by the live connection
// (messageCache.ts), never fetched as a page.
//
// A refetch (after a reconnect, say) re-fetches EVERY loaded page in order,
// each with the cursor the previous answer gives — the thread comes back
// exactly as long as it was.
export function useConversationMessages(id: number) {
  return useInfiniteQuery({
    queryKey: messagesQueryKey(id),
    queryFn: ({ pageParam }) => fetchMessagesPage(id, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: olderPageParam,
  })
}