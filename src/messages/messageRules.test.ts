import { describe, expect, it } from 'vitest'
import {
  compareByActivity,
  groupByDay,
  MESSAGE_MAX_LENGTH,
  messageProblem,
  newestUnreadFrom,
  olderPageParam,
  splitArchived,
  threadMessages,
  unreadTotal,
} from './messageRules'
import { isMessagingRole, conversationPath, messagesPath } from './messagesPath'
import { ALEX_ID, message, page, PAT_ID, summary } from './testData'

describe('threadMessages', () => {
  it('puts the pages oldest first: the older pages (fetched later) come before', () => {
    // Page 0 is the newest; page 1 was fetched with "before 3".
    const pages = [page([message(3), message(4)]), page([message(1), message(2)], true)]
    expect(threadMessages(pages).map((m) => m.id)).toEqual([1, 2, 3, 4])
  })

  it('is empty for an empty thread', () => {
    expect(threadMessages([page([])])).toEqual([])
  })
})

describe('olderPageParam', () => {
  it("is the oldest message's id while there is more", () => {
    expect(olderPageParam(page([message(5), message(6)], true))).toBe(5)
  })

  it('is undefined at the very beginning — no more pages', () => {
    expect(olderPageParam(page([message(5), message(6)], false))).toBeUndefined()
  })
})

describe('groupByDay', () => {
  it('groups consecutive messages by local day', () => {
    const groups = groupByDay([
      message(1, { sentAt: new Date(2031, 5, 2, 9).toISOString() }),
      message(2, { sentAt: new Date(2031, 5, 2, 23, 59).toISOString() }),
      message(3, { sentAt: new Date(2031, 5, 3, 0, 1).toISOString() }),
    ])
    expect(groups.map((g) => [g.day, g.messages.map((m) => m.id)])).toEqual([
      ['2031-06-02', [1, 2]],
      ['2031-06-03', [3]],
    ])
  })

  it('is empty for no messages', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('newestUnreadFrom', () => {
  it("is the newest of the other person's unread messages", () => {
    const messages = [message(1), message(2), message(3, { senderId: ALEX_ID })]
    expect(newestUnreadFrom(messages, ALEX_ID)).toBe(2)
  })

  it('ignores my own, read and deleted messages', () => {
    const messages = [
      message(1, { senderId: ALEX_ID }),
      message(2, { readAt: '2031-06-02T10:00:00.000Z' }),
      message(3, { deletedAt: '2031-06-02T10:00:00.000Z', messageBody: null }),
    ]
    expect(newestUnreadFrom(messages, ALEX_ID)).toBeNull()
  })

  it('takes the highest id even out of order', () => {
    expect(newestUnreadFrom([message(4), message(2)], ALEX_ID)).toBe(4)
  })
})

describe('the list', () => {
  it('splits archived conversations from the inbox, keeping the order', () => {
    const a = summary({ id: 1 })
    const b = summary({ id: 2, archivedAt: '2031-06-02T10:00:00.000Z' })
    const c = summary({ id: 3 })
    expect(splitArchived([a, b, c])).toEqual({ inbox: [a, c], archived: [b] })
  })

  it('adds up every unread message, archived ones included', () => {
    expect(
      unreadTotal([
        summary({ id: 1, unreadCount: 2 }),
        summary({ id: 2, unreadCount: 3, archivedAt: '2031-06-02T10:00:00.000Z' }),
      ]),
    ).toBe(5)
    expect(unreadTotal([])).toBe(0)
  })

  it('orders by newest activity: the last message, else the creation', () => {
    const old = summary({ id: 1, lastMessage: message(1) })
    const recent = summary({ id: 2, lastMessage: message(30) })
    // No message, but created after message 1 was sent.
    const created = summary({ id: 3, createdAt: '2031-06-02T09:10:00.000Z' })
    expect([old, recent, created].sort(compareByActivity).map((c) => c.id)).toEqual([2, 3, 1])
  })

  it('breaks a tie by the higher id', () => {
    const a = summary({ id: 1 })
    const b = summary({ id: 2 })
    expect([a, b].sort(compareByActivity).map((c) => c.id)).toEqual([2, 1])
  })
})

describe('messageProblem', () => {
  it('refuses nothing but spaces and line breaks', () => {
    expect(messageProblem('')).toBe('blank')
    expect(messageProblem('  \n\t ')).toBe('blank')
  })

  it('accepts up to the limit, not one character more', () => {
    expect(messageProblem('a'.repeat(MESSAGE_MAX_LENGTH))).toBeNull()
    expect(messageProblem('a'.repeat(MESSAGE_MAX_LENGTH + 1))).toBe('too_long')
  })

  it('accepts a message with spaces around it', () => {
    expect(messageProblem('  hello  ')).toBeNull()
  })
})

describe('messagesPath', () => {
  it("builds each role's addresses", () => {
    expect(messagesPath('practitioner')).toBe('/practitioner/messages')
    expect(messagesPath('patient')).toBe('/patient/messages')
    expect(conversationPath('patient', 12)).toBe('/patient/messages/12')
  })

  it('knows admins have no messaging', () => {
    expect(isMessagingRole('practitioner')).toBe(true)
    expect(isMessagingRole('patient')).toBe(true)
    expect(isMessagingRole('admin')).toBe(false)
  })
})

// Keeps the fixtures honest: Pat is the sender by default.
it('uses Pat as the default sender', () => {
  expect(message(1).senderId).toBe(PAT_ID)
})