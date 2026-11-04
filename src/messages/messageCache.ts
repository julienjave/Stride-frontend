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

import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import { conversationQueryKey, conversationsQueryKey, messagesQueryKey } from './api'
import { compareByActivity } from './messageRules'
import type { ConversationSummary, Message, MessagesPage, ServerEvents } from './types'

// How a live event (or a send's acknowledgement) changes what the screens
// already hold — written INTO the cache, not fetched again: the event
// carries everything needed, and a refetch per message would mean three
// requests (list, header, thread) for every word someone types.
//
// Two layers, as everywhere in this app: PURE functions that take cached
// data and return the new data (tested with plain values), and appliers
// that read and write the QueryClient with them.

export type Thread = InfiniteData<MessagesPage, number | undefined>

// --- Pure: a thread -------------------------------------------------------------

// A message into a loaded thread: REPLACED where it already is (the
// sender's own message arrives twice — the acknowledgement AND the event to
// every one of their tabs — and a deletion re-sends a known message); else
// ADDED to the newest page (page 0), kept in id order (ids grow with every
// message, so id order IS sending order, even if two events arrive out of
// order). A thread nobody has loaded stays unloaded: it is fetched whole
// when opened.
export function threadWithMessage(thread: Thread | undefined, message: Message): Thread | undefined {
  if (!thread) return thread
  const known = thread.pages.some((page) => page.messages.some((m) => m.id === message.id))
  if (known) {
    return {
      ...thread,
      pages: thread.pages.map((page) => ({
        ...page,
        messages: page.messages.map((m) => (m.id === message.id ? message : m)),
      })),
    }
  }
  const [newest, ...older] = thread.pages
  return {
    ...thread,
    pages: [{ ...newest, messages: [...newest.messages, message].sort((a, b) => a.id - b.id) }, ...older],
  }
}

// Messages marked read (the conversationRead event): their readAt set.
export function threadWithRead(
  thread: Thread | undefined,
  messageIds: readonly number[],
  readAt: string,
): Thread | undefined {
  if (!thread) return thread
  const ids = new Set(messageIds)
  return {
    ...thread,
    pages: thread.pages.map((page) => ({
      ...page,
      messages: page.messages.map((m) => (ids.has(m.id) ? { ...m, readAt } : m)),
    })),
  }
}

// --- Pure: one conversation's summary --------------------------------------------

// A NEW message, seen from my side. Only a message newer than the one the
// summary already knows changes it — so the same message arriving twice, or
// after a refetch that already counted it, counts once:
//   - it becomes the preview;
//   - from the other person, one more unread;
//   - the conversation is back in BOTH lists (decided 2026-10-20: a new
//     message unarchives).
export function summaryWithMessage(
  summary: ConversationSummary,
  message: Message,
  myId: number,
): ConversationSummary {
  if (summary.lastMessage && summary.lastMessage.id >= message.id) return summary
  return {
    ...summary,
    lastMessage: message,
    unreadCount: summary.unreadCount + (message.senderId === myId ? 0 : 1),
    archivedAt: null,
  }
}

// --- Pure: the list ----------------------------------------------------------------

// The list after a new message: that row updated and moved to its place
// (newest activity first, the backend's own order). `null` when the
// conversation isn't in the list — a new one, or one that had no message
// yet (the list leaves those out): the caller fetches the list again rather
// than inventing a row.
export function listWithMessage(
  list: ConversationSummary[],
  message: Message,
  myId: number,
): ConversationSummary[] | null {
  if (!list.some((c) => c.id === message.conversationId)) return null
  return list
    .map((c) => (c.id === message.conversationId ? summaryWithMessage(c, message, myId) : c))
    .sort(compareByActivity)
}

// I read a conversation (in this tab or another): nothing unread left there.
// The OTHER person reading changes nothing in my list.
export function listWithRead(
  list: ConversationSummary[],
  conversationId: number,
  readerId: number,
  myId: number,
): ConversationSummary[] {
  if (readerId !== myId) return list
  return list.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
}

export function listWithArchived(
  list: ConversationSummary[],
  conversationId: number,
  archivedAt: string | null,
): ConversationSummary[] {
  return list.map((c) => (c.id === conversationId ? { ...c, archivedAt } : c))
}

// --- Appliers ----------------------------------------------------------------------

// A message that is NEW to this tab: from the newMessage event, or from the
// acknowledgement of my own send (whichever arrives first wins; the second
// changes nothing — see threadWithMessage and summaryWithMessage).
export function applyNewMessage(queryClient: QueryClient, message: Message, myId: number) {
  const id = message.conversationId
  queryClient.setQueryData<Thread>(messagesQueryKey(id), (thread) => threadWithMessage(thread, message))
  queryClient.setQueryData<ConversationSummary>(conversationQueryKey(id), (summary) =>
    summary ? summaryWithMessage(summary, message, myId) : summary,
  )
  const list = queryClient.getQueryData<ConversationSummary[]>(conversationsQueryKey)
  if (!list) return
  const next = listWithMessage(list, message, myId)
  if (next) queryClient.setQueryData(conversationsQueryKey, next)
  else void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
}

// A deleted message: replaced in its thread (its text is gone). The list
// and the header are fetched again instead of patched: a deletion may
// change the preview AND the recipient's unread count (a message is only
// deletable while unread), and it is rare — one small request, no
// arithmetic to get wrong.
export function applyDeletedMessage(queryClient: QueryClient, message: Message) {
  const id = message.conversationId
  queryClient.setQueryData<Thread>(messagesQueryKey(id), (thread) => threadWithMessage(thread, message))
  void queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })
  void queryClient.invalidateQueries({ queryKey: conversationQueryKey(id), exact: true })
}

export function applyRead(
  queryClient: QueryClient,
  event: ServerEvents['conversationRead'],
  myId: number,
) {
  const { conversationId, readerId, readAt, messageIds } = event
  queryClient.setQueryData<Thread>(messagesQueryKey(conversationId), (thread) =>
    threadWithRead(thread, messageIds, readAt),
  )
  if (readerId !== myId) return
  queryClient.setQueryData<ConversationSummary>(conversationQueryKey(conversationId), (summary) =>
    summary ? { ...summary, unreadCount: 0 } : summary,
  )
  queryClient.setQueryData<ConversationSummary[]>(conversationsQueryKey, (list) =>
    list ? listWithRead(list, conversationId, readerId, myId) : list,
  )
}

export function applyArchived(queryClient: QueryClient, event: ServerEvents['conversationArchived']) {
  const { conversationId, archivedAt } = event
  queryClient.setQueryData<ConversationSummary>(conversationQueryKey(conversationId), (summary) =>
    summary ? { ...summary, archivedAt } : summary,
  )
  queryClient.setQueryData<ConversationSummary[]>(conversationsQueryKey, (list) =>
    list ? listWithArchived(list, conversationId, archivedAt) : list,
  )
}