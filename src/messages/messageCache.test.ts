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

import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { conversationQueryKey, conversationsQueryKey, messagesQueryKey } from './api'
import {
  applyArchived,
  applyDeletedMessage,
  applyNewMessage,
  applyRead,
  listWithArchived,
  listWithMessage,
  listWithRead,
  summaryWithMessage,
  threadWithMessage,
  threadWithRead,
  type Thread,
} from './messageCache'
import { ALEX_ID, message, page, PAT_ID, summary } from './testData'
import type { ConversationSummary } from './types'

function thread(...pages: ReturnType<typeof page>[]): Thread {
  return { pages, pageParams: pages.map((_, i) => (i === 0 ? undefined : i)) }
}
const ids = (t: Thread | undefined) => t?.pages.map((p) => p.messages.map((m) => m.id))

describe('threadWithMessage', () => {
  it('adds a new message to the newest page, in id order', () => {
    const before = thread(page([message(3), message(5)]), page([message(1)], true))
    expect(ids(threadWithMessage(before, message(6)))).toEqual([[3, 5, 6], [1]])
    // Arriving out of order still lands in its place.
    expect(ids(threadWithMessage(before, message(4)))).toEqual([[3, 4, 5], [1]])
  })

  it('replaces a message it already has, wherever it is — no duplicate', () => {
    const before = thread(page([message(3)]), page([message(1)], true))
    const deleted = message(1, { messageBody: null, deletedAt: '2031-06-02T10:00:00.000Z' })
    const after = threadWithMessage(before, deleted)
    expect(ids(after)).toEqual([[3], [1]])
    expect(after?.pages[1].messages[0].messageBody).toBeNull()
  })

  it('leaves an unloaded thread unloaded', () => {
    expect(threadWithMessage(undefined, message(1))).toBeUndefined()
  })
})

describe('threadWithRead', () => {
  it('stamps only the named messages', () => {
    const after = threadWithRead(thread(page([message(1), message(2)])), [2], '2031-06-02T10:00:00.000Z')
    expect(after?.pages[0].messages.map((m) => m.readAt)).toEqual([null, '2031-06-02T10:00:00.000Z'])
    expect(threadWithRead(undefined, [2], 'x')).toBeUndefined()
  })
})

describe('summaryWithMessage', () => {
  it("makes their message the preview, counts it unread and brings the conversation back", () => {
    const after = summaryWithMessage(
      summary({ lastMessage: message(1), unreadCount: 1, archivedAt: '2031-06-01T00:00:00.000Z' }),
      message(2),
      ALEX_ID,
    )
    expect(after).toMatchObject({ lastMessage: { id: 2 }, unreadCount: 2, archivedAt: null })
  })

  it('does not count my own message as unread', () => {
    expect(summaryWithMessage(summary(), message(2, { senderId: ALEX_ID }), ALEX_ID).unreadCount).toBe(0)
  })

  it('counts a message once — the same one again, or an older one, changes nothing', () => {
    const known = summary({ lastMessage: message(2), unreadCount: 1 })
    expect(summaryWithMessage(known, message(2), ALEX_ID)).toBe(known)
    expect(summaryWithMessage(known, message(1), ALEX_ID)).toBe(known)
  })
})

describe('the list', () => {
  const a = summary({ id: 12, lastMessage: message(1) })
  const b = summary({ id: 13, lastMessage: message(5, { conversationId: 13 }) })

  it('moves the conversation with a new message to the top', () => {
    expect(listWithMessage([b, a], message(9), ALEX_ID)?.map((c) => c.id)).toEqual([12, 13])
  })

  it("is null for a conversation that isn't in the list — to be fetched", () => {
    expect(listWithMessage([a], message(9, { conversationId: 99 }), ALEX_ID)).toBeNull()
  })

  it('clears my unread count when I read — not when they do', () => {
    const list = [summary({ unreadCount: 3 })]
    expect(listWithRead(list, 12, ALEX_ID, ALEX_ID)[0].unreadCount).toBe(0)
    expect(listWithRead(list, 12, PAT_ID, ALEX_ID)).toBe(list)
  })

  it('archives and unarchives one conversation', () => {
    expect(listWithArchived([a, b], 13, '2031-06-02T00:00:00.000Z').map((c) => c.archivedAt)).toEqual([
      null,
      '2031-06-02T00:00:00.000Z',
    ])
  })
})

describe('the appliers', () => {
  function seeded() {
    const queryClient = new QueryClient()
    queryClient.setQueryData(conversationsQueryKey, [summary({ lastMessage: message(1), unreadCount: 1 })])
    queryClient.setQueryData(conversationQueryKey(12), summary({ lastMessage: message(1), unreadCount: 1 }))
    queryClient.setQueryData(messagesQueryKey(12), thread(page([message(1)])))
    return queryClient
  }

  it('writes a new message into the thread, the header and the list', () => {
    const queryClient = seeded()
    applyNewMessage(queryClient, message(2), ALEX_ID)
    expect(ids(queryClient.getQueryData(messagesQueryKey(12)))).toEqual([[1, 2]])
    expect(queryClient.getQueryData<ConversationSummary>(conversationQueryKey(12))?.unreadCount).toBe(2)
    expect(queryClient.getQueryData<ConversationSummary[]>(conversationsQueryKey)?.[0].unreadCount).toBe(2)
  })

  it('counts the acknowledgement and the event of the same message once', () => {
    const queryClient = seeded()
    applyNewMessage(queryClient, message(2, { senderId: ALEX_ID }), ALEX_ID)
    applyNewMessage(queryClient, message(2, { senderId: ALEX_ID }), ALEX_ID)
    expect(ids(queryClient.getQueryData(messagesQueryKey(12)))).toEqual([[1, 2]])
    expect(queryClient.getQueryData<ConversationSummary[]>(conversationsQueryKey)?.[0].unreadCount).toBe(1)
  })

  it('fetches the list again — only it — for a conversation it does not hold', () => {
    const queryClient = seeded()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    applyNewMessage(queryClient, message(1, { conversationId: 40 }), ALEX_ID)
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: conversationsQueryKey, exact: true })
  })

  it('does nothing to a list nobody has loaded', () => {
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    applyNewMessage(queryClient, message(1), ALEX_ID)
    expect(invalidate).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(conversationsQueryKey)).toBeUndefined()
  })

  it('replaces a deleted message and fetches the list and header again', () => {
    const queryClient = seeded()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    applyDeletedMessage(queryClient, message(1, { messageBody: null, deletedAt: '2031-06-02T10:00:00.000Z' }))
    expect(queryClient.getQueryData<Thread>(messagesQueryKey(12))?.pages[0].messages[0].messageBody).toBeNull()
    expect(invalidate.mock.calls).toEqual([
      [{ queryKey: conversationsQueryKey, exact: true }],
      [{ queryKey: conversationQueryKey(12), exact: true }],
    ])
  })

  it('my reading clears the counts; theirs only stamps the thread', () => {
    const readAt = '2031-06-02T10:00:00.000Z'
    const theirs = seeded()
    applyRead(theirs, { conversationId: 12, readerId: PAT_ID, readAt, messageIds: [1] }, ALEX_ID)
    expect(theirs.getQueryData<Thread>(messagesQueryKey(12))?.pages[0].messages[0].readAt).toBe(readAt)
    expect(theirs.getQueryData<ConversationSummary>(conversationQueryKey(12))?.unreadCount).toBe(1)
    expect(theirs.getQueryData<ConversationSummary[]>(conversationsQueryKey)?.[0].unreadCount).toBe(1)

    const mine = seeded()
    applyRead(mine, { conversationId: 12, readerId: ALEX_ID, readAt, messageIds: [1] }, ALEX_ID)
    expect(mine.getQueryData<ConversationSummary>(conversationQueryKey(12))?.unreadCount).toBe(0)
    expect(mine.getQueryData<ConversationSummary[]>(conversationsQueryKey)?.[0].unreadCount).toBe(0)
  })

  it('archives in the header and the list', () => {
    const queryClient = seeded()
    applyArchived(queryClient, { conversationId: 12, archivedAt: '2031-06-02T10:00:00.000Z' })
    expect(queryClient.getQueryData<ConversationSummary>(conversationQueryKey(12))?.archivedAt).toBe(
      '2031-06-02T10:00:00.000Z',
    )
    expect(queryClient.getQueryData<ConversationSummary[]>(conversationsQueryKey)?.[0].archivedAt).toBe(
      '2031-06-02T10:00:00.000Z',
    )
  })
})