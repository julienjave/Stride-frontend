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