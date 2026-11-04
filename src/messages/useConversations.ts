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

import { useQuery } from '@tanstack/react-query'
import { conversationsQueryKey, fetchConversations } from './api'
import { unreadTotal } from './messageRules'

// My conversation list — the Messages list, and the source of the unread
// count. One cache entry for everything that reads it; the live connection
// keeps it up to date (messageCache.ts).
export function useConversations() {
  return useQuery({ queryKey: conversationsQueryKey, queryFn: fetchConversations })
}

// The unread total for the tab badge (every page of a practitioner or a
// patient) and the practitioner home's slot. The SAME query as the list —
// `select` derives a number from the cached list, so the badge costs no
// request of its own, and re-renders only when the number changes.
// (Admins never call it: AuthenticatedLayout reads it for the messaging
// roles only.)
export function useUnreadMessageCount() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: fetchConversations,
    select: unreadTotal,
  })
}