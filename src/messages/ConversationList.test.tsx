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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiError, json } from '@/sessions/testData'
import { expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import { fakeApi, fetchMock, renderMessages } from './renderMessages'
import { listTimeText } from './messageText'
import { ALEX_ID, message, PAT_PERSON, summary } from './testData'
import type { ConversationSummary } from './types'
import { expectSkeleton, holdRequests } from '@/common/loadingAssertions'

vi.stubGlobal('fetch', fetchMock)

const SAM_PERSON = { id: 9, firstName: 'Sam', lastName: 'Okafor', avatarUrl: null }

let list: ConversationSummary[]

beforeEach(() => {
  fetchMock.mockReset()
  list = []
  fakeApi(({ method, path }) => {
    if (method === 'GET' && path === '/conversations') return json(list)
    return undefined
  })
})

const inbox = () => screen.findByRole('list', { name: 'Inbox' })
const rowNames = async () =>
  within(await inbox())
    .getAllByRole('link')
    .map((link) => link.textContent)

describe('the conversation list', () => {
  it('shows each conversation: who, the preview, the unread count — in the server’s order', async () => {
    list = [
      summary({ lastMessage: message(5, { messageBody: 'Knee feels better' }), unreadCount: 2 }),
      summary({
        id: 13,
        otherParticipant: SAM_PERSON,
        lastMessage: message(4, { conversationId: 13, senderId: ALEX_ID, messageBody: 'See you Monday' }),
      }),
    ]
    renderMessages('/practitioner/messages')
    const links = within(await inbox()).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/practitioner/messages/12')
    expect(links[0]).toHaveTextContent('Pat Lee')
    expect(links[0]).toHaveTextContent('Knee feels better')
    // The badge's number is for the eye; the words are what's read out.
    expect(links[0]).toHaveTextContent('2 unread')
    expect(links[1]).toHaveTextContent('Sam Okafor')
    expect(links[1]).toHaveTextContent('You: See you Monday')
    expect(links[1]).not.toHaveTextContent('unread')
  })

  it('says when a conversation is read-only', async () => {
    list = [summary({ lastMessage: message(1), canSend: false })]
    renderMessages('/practitioner/messages')
    expect(within(await inbox()).getByRole('link')).toHaveTextContent('Read only')
  })

  it('marks the open conversation as the current one', async () => {
    list = [summary({ lastMessage: message(1) }), summary({ id: 13, otherParticipant: SAM_PERSON })]
    fakeApi(({ path }) => {
      if (path === '/conversations') return json(list)
      if (path === '/conversations/12/messages') return json({ messages: [message(1)], hasMore: false })
      if (path === '/conversations/12/read') return json({ conversationId: 12, readAt: null, messageIds: [] })
      return undefined
    })
    renderMessages('/practitioner/messages/12')
    const links = within(await inbox()).getAllByRole('link')
    expect(links[0]).toHaveAttribute('aria-current', 'page')
    expect(links[1]).not.toHaveAttribute('aria-current')
  })

  it('keeps archived conversations behind a switch that says how many', async () => {
    list = [
      summary({ lastMessage: message(2) }),
      summary({ id: 13, otherParticipant: SAM_PERSON, archivedAt: '2031-06-01T00:00:00.000Z' }),
    ]
    renderMessages('/practitioner/messages')
    expect(await rowNames()).toEqual([expect.stringContaining('Pat Lee')])
    expect(screen.queryByRole('list', { name: 'Archived conversations' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show 1 archived conversation' }))
    const archived = screen.getByRole('list', { name: 'Archived conversations' })
    expect(within(archived).getByRole('link')).toHaveTextContent('Sam Okafor')
  })

  it('says so when every conversation is archived', async () => {
    list = [summary({ lastMessage: message(2), archivedAt: '2031-06-01T00:00:00.000Z' })]
    renderMessages('/practitioner/messages')
    expect(await screen.findByText('Every conversation is archived.')).toBeInTheDocument()
  })

  it('invites to start one when there is none', async () => {
    renderMessages('/practitioner/messages')
    expect(await screen.findByText('No messages yet. Start a conversation with New message.')).toBeInTheDocument()
    // The desktop pane beside it says the same thing in its own words.
    expect(screen.getByText('Choose a conversation, or start one with New message.')).toBeInTheDocument()
  })

  it('says it could not load, and why; a retry that works focuses the heading', async () => {
    const user = userEvent.setup()
    let fail = true
    fakeApi(({ method, path }) =>
      method === 'GET' && path === '/conversations' ? (fail ? apiError(500, 'boom') : json([])) : undefined,
    )
    renderMessages('/practitioner/messages')
    await expectLoadError('your conversations')
    fail = false
    await retryThenExpectFocusOn(user, { level: 1, name: 'Messages' })
    expect(await screen.findByText('No messages yet. Start a conversation with New message.')).toBeInTheDocument()
  })

  it('updates live: a new message becomes the preview, counts as unread, and moves its row to the top', async () => {
    list = [
      summary({ id: 13, otherParticipant: SAM_PERSON, lastMessage: message(5, { conversationId: 13 }) }),
      summary({ lastMessage: message(1) }),
    ]
    const { socket } = renderMessages('/practitioner/messages')
    expect(await rowNames()).toEqual([expect.stringContaining('Sam'), expect.stringContaining('Pat')])
    const before = fetchMock.mock.calls.length

    socket.push('newMessage', message(9, { messageBody: 'Quick question' }))

    const links = within(await inbox()).getAllByRole('link')
    expect(links[0]).toHaveTextContent('Pat Lee')
    expect(links[0]).toHaveTextContent('Quick question')
    expect(links[0]).toHaveTextContent('1 unread')
    // Written into the cache — no request for it.
    expect(fetchMock.mock.calls.length).toBe(before)
  })

  it("asks for the list again when a message arrives in a conversation it doesn't show", async () => {
    const { socket } = renderMessages('/practitioner/messages')
    await screen.findByText(/No messages yet/)
    list = [summary({ lastMessage: message(3), unreadCount: 1 })]
    socket.push('newMessage', message(3))
    expect(await rowNames()).toEqual([expect.stringContaining('Pat Lee')])
  })

  it('works the same for a patient, under their own addresses', async () => {
    list = [summary({ otherParticipant: { ...PAT_PERSON, firstName: 'Alex', lastName: 'Chen' }, lastMessage: message(1) })]
    renderMessages('/patient/messages', { user: { id: 6, activeRole: 'patient' } })
    expect(within(await inbox()).getByRole('link')).toHaveAttribute('href', '/patient/messages/12')
  })
})

// The list loads behind a skeleton of rows with photos (pass 2).
describe('ConversationList — while it loads', () => {
  it('a skeleton of the conversations', async () => {
    holdRequests(fetchMock, (url) => new URL(url).pathname === '/conversations')
    renderMessages('/practitioner/messages')
    await waitFor(() => expectSkeleton('Loading your conversations…'))
  })
})

// The list stays open for hours beside a conversation, so its times follow
// the clock (useCurrentDateTime ticks every minute). Only Date and the
// interval are faked: Testing Library's waiting and TanStack Query use
// setTimeout, which stays real.
describe('ConversationList — the times follow the clock', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("turns today's time into the day once midnight passes, without reopening", async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    // Local times (whatever TZ the run uses): the message at 23:50, the
    // list opened at 23:59:30 — thirty seconds before midnight.
    const sentAt = new Date(2031, 5, 3, 23, 50).toISOString()
    vi.setSystemTime(new Date(2031, 5, 3, 23, 59, 30))
    list = [summary({ lastMessage: message(1, { sentAt }) })]
    renderMessages('/practitioner/messages')
    const row = within(await inbox()).getByRole('link')

    // What the rule (listTimeText) says on each side of midnight — the test
    // checks the WIRING (the list re-reads the clock), not the wording,
    // which messageText's own tests cover. They must differ, or the test
    // would prove nothing.
    const beforeMidnight = listTimeText(sentAt, new Date(2031, 5, 3, 23, 59, 30))
    const afterMidnight = listTimeText(sentAt, new Date(2031, 5, 4, 0, 0, 30))
    expect(beforeMidnight).not.toBe(afterMidnight)
    expect(row).toHaveTextContent(beforeMidnight)

    // One tick of the clock: it is now 00:00:30, the next day.
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(row).toHaveTextContent(afterMidnight)
    expect(row).not.toHaveTextContent(beforeMidnight)
  })
})