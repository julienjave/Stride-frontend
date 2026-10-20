import { apiRequest } from '@/api/client'
import type { ConversationSummary, MessagesPage, ReadReceipt } from './types'

// --- Cache keys ---------------------------------------------------------------
//
// Everything about messaging lives under ONE prefix, ['conversations'], so a
// single invalidation (after the socket reconnects: whatever happened while
// it was down) refreshes the list, every open thread and every header at
// once:
//
//   ['conversations', 'list']        the list (and the unread total)
//   ['conversations', 12]            one conversation's summary (the header)
//   ['conversations', 12, 'messages'] its thread — an INFINITE query (pages)
//
// The list's key is a word, not a number, so it can never collide with a
// conversation's id.
export const CONVERSATIONS_PREFIX = ['conversations'] as const

export const conversationsQueryKey = [...CONVERSATIONS_PREFIX, 'list'] as const

export function conversationQueryKey(id: number) {
  return [...CONVERSATIONS_PREFIX, id] as const
}

export function messagesQueryKey(id: number) {
  return [...conversationQueryKey(id), 'messages'] as const
}

// --- Requests -----------------------------------------------------------------

export function fetchConversations() {
  return apiRequest<ConversationSummary[]>('/conversations')
}

export function fetchConversation(id: number) {
  return apiRequest<ConversationSummary>(`/conversations/${id}`)
}

// One page of a thread: the newest without `before`, else the messages
// older than that id (cursor pagination — the backend explains why not page
// numbers).
export function fetchMessagesPage(id: number, before?: number) {
  const query = before === undefined ? '' : `?before=${before}`
  return apiRequest<MessagesPage>(`/conversations/${id}/messages${query}`)
}

// "Start or get" the conversation with someone on my care team — the
// "Message" buttons and New message.
export function startConversation(userId: number) {
  return apiRequest<ConversationSummary>('/conversations', {
    method: 'POST',
    body: { userId },
  })
}

export function markConversationRead(id: number) {
  return apiRequest<ReadReceipt>(`/conversations/${id}/read`, { method: 'PATCH' })
}