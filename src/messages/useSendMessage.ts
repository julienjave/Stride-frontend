import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { conversationQueryKey, conversationsQueryKey } from './api'
import { applyNewMessage } from './messageCache'
import { useMessagingConnection } from './messagingConnection'
import type { Message } from './types'

// The server refused the message — its status and its own words (a blank
// message, a read-only conversation…). Thrown by the mutation so the
// composer can show `message` as it is.
// (The field is declared, then set: the project's `erasableSyntaxOnly`
// forbids the `constructor(readonly status: number)` shorthand — TypeScript
// syntax that would have to generate JavaScript, rather than just be erased.)
export class MessageRefusedError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'MessageRefusedError'
    this.status = status
  }
}

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
      const answer = await connection.send<Message>('sendMessage', { conversationId, messageBody })
      if (!answer.ok) throw new MessageRefusedError(answer.status, answer.message.join(' '))
      return answer.data
    },
    onSuccess: (message) => {
      if (me) applyNewMessage(queryClient, message, me.id)
    },
    onError: (error) => {
      // 403 = no longer on a care team together: the header still says
      // "can send" until it is fetched again — do that now, so the page
      // turns read-only instead of offering a box that will refuse again.
      if (error instanceof MessageRefusedError && error.status === 403) {
        void queryClient.invalidateQueries({ queryKey: conversationQueryKey(conversationId), exact: true })
        void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
      }
    },
  })
}