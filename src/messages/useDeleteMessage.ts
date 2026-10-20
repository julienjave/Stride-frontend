import { useMutation, useQueryClient } from '@tanstack/react-query'
import { messagesQueryKey } from './api'
import { applyDeletedMessage } from './messageCache'
import { useMessagingConnection } from './messagingConnection'
import { dataOrThrow, MessageRefusedError } from './socketAnswer'
import type { Message } from './types'

// Deleting one of MY messages — over the socket, like sending (the
// `deleteMessage` event), and with the same answer: the stored message, now
// without its text (`messageBody: null`, `deletedAt` set).
//
// The acknowledgement and the `messageDeleted` event both bring it, and
// both go through applyDeletedMessage: the bubble is REPLACED in place
// (threadWithMessage finds it by id — twice is the same as once), and the
// list and header are fetched again (the preview and the other person's
// unread count may change).
export function useDeleteMessage(conversationId: number) {
  const connection = useMessagingConnection()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageId: number) =>
      dataOrThrow(await connection.send<Message>('deleteMessage', { conversationId, messageId })),
    onSuccess: (message) => applyDeletedMessage(queryClient, message),
    onError: (error) => {
      // 409 = the server says it's too late: read meanwhile, or past the 15
      // minutes by ITS clock (this device's may differ — messageRules.ts,
      // deletableUntil). Fetch the thread again so the screen matches what
      // the server knows: a read message gets its readAt, and the Delete
      // button goes. The dialog keeps showing the server's words.
      if (error instanceof MessageRefusedError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId), exact: true })
      }
    },
  })
}