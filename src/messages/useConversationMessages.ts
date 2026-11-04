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