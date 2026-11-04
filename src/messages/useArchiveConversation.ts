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
import { archiveConversation, unarchiveConversation } from './api'
import { applyArchived } from './messageCache'

// Archive (true) or unarchive (false) one conversation, in MY list.
//
// The answer is the conversation's summary; its `archivedAt` is written
// into the cache by the SAME applier the `conversationArchived` event uses
// (applyArchived: the header and the list's row) — so this tab and my
// other tabs, which get the event, end up holding exactly the same thing.
export function useArchiveConversation(conversationId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (archive: boolean) =>
      archive ? archiveConversation(conversationId) : unarchiveConversation(conversationId),
    onSuccess: (summary) => applyArchived(queryClient, { conversationId, archivedAt: summary.archivedAt }),
  })
}