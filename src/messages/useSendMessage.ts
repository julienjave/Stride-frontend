import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { conversationQueryKey, conversationsQueryKey } from './api'
import { applyNewMessage } from './messageCache'
import { useMessagingConnection } from './messagingConnection'
import { dataOrThrow, MessageRefusedError } from './socketAnswer'
import type { Message } from './types'

// Sending goes through the SOCKET, not the REST fallback (the roadmap), and
// WAITS for the server's acknowledgement before the message appears
// (decided 2026-10-20: no optimistic bubble in this pass — that stays the
// Phase 7 item). A useMutation gives the composer its states for free:
// `isPending` = "Sending…", `error` = why not, `mutateAsync` resolves once
// the message is stored.
//
// The acknowledgement and the newMessage event both bring the stored
// message; whichever arrives first puts it in the cache, the second changes
// nothing (messageCache.ts).
export function useSendMessage(conversationId: number) {
  const connection = useMessagingConnection()
  const queryClient = useQueryClient()
  const { data: me } = useCurrentUser()

  return useMutation({
    mutationFn: async (messageBody: string) => {
      return dataOrThrow(await connection.send<Message>('sendMessage', { conversationId, messageBody }))
    },
    onSuccess: (message) => {
      if (me) applyNewMessage(queryClient, message, me.id)
    },
    onError: (error) => {
      // 403 = no longer on a care team together; 409 = the patient's account
      // was deactivated meanwhile (decisions §22 — sending answers no other
      // 409). Either way the header still says "can send" until it is
      // fetched again — do that now, so the page turns read-only (with the
      // right words) instead of offering a box that will refuse again.
      if (error instanceof MessageRefusedError && (error.status === 403 || error.status === 409)) {
        void queryClient.invalidateQueries({ queryKey: conversationQueryKey(conversationId), exact: true })
        void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
      }
    },
  })
}