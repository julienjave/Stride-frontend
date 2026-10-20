import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiError, json } from '@/sessions/testData'
import { conversationQueryKey } from './api'
import { fakeApi, fetchMock, renderMessages, requests } from './renderMessages'
import { ALEX_ID, message, page, summary } from './testData'
import type { ConversationSummary, MessagesPage } from './types'

vi.stubGlobal('fetch', fetchMock)

// What the fake server holds — each test changes what it is about.
let conversation: ConversationSummary | Response
let pages: Record<string, MessagesPage>

beforeEach(() => {
  fetchMock.mockReset()
  conversation = summary({ lastMessage: message(2), unreadCount: 0 })
  pages = { '': page([message(1, { senderId: ALEX_ID, readAt: '2031-06-02T09:30:00.000Z' }), message(2, { readAt: '2031-06-02T09:30:00.000Z' })]) }
  fakeApi(({ method, path }) => {
    if (method === 'GET' && path === '/conversations') return json([])
    if (method === 'GET' && path === '/conversations/12') {
      return conversation instanceof Response ? conversation.clone() : json(conversation)
    }
    const thread = /^\/conversations\/12\/messages(?:\?before=(\d+))?$/.exec(path)
    if (method === 'GET' && thread) return json(pages[thread[1] ?? ''])
    if (method === 'PATCH' && path === '/conversations/12/read') {
      return json({ conversationId: 12, readAt: '2031-06-02T10:00:00.000Z', messageIds: [3] })
    }
    return undefined
  })
})

const log = () => screen.findByRole('log', { name: 'Messages with Pat Lee' })
const box = () => screen.getByRole('textbox', { name: 'Message' })

describe('a conversation', () => {
  it('shows who it is with, and the messages — whose each is, for a screen reader too', async () => {
    renderMessages('/practitioner/messages/12')
    expect(await screen.findByRole('heading', { level: 2, name: 'Pat Lee' })).toBeInTheDocument()
    const items = within(await log()).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('You: Message 1'),
      expect.stringContaining('Pat Lee: Message 2'),
    ])
    // A way back to the list (phones).
    expect(screen.getByRole('link', { name: 'Back to messages' })).toHaveAttribute('href', '/practitioner/messages')
  })

  it('says a deleted message was deleted, without its text', async () => {
    pages[''] = page([message(1, { messageBody: null, deletedAt: '2031-06-02T09:10:00.000Z' })])
    renderMessages('/practitioner/messages/12')
    const item = (await screen.findByText(/Message deleted/)).closest('li')
    expect(item).toHaveTextContent('Pat Lee: Message deleted')
  })

  it('says nothing was written yet in an empty conversation', async () => {
    conversation = summary()
    pages[''] = page([])
    renderMessages('/practitioner/messages/12')
    expect(await screen.findByText('No messages yet')).toBeInTheDocument()
  })

  it('loads earlier messages on demand, above the others', async () => {
    pages[''] = page([message(3), message(4)], true)
    pages['3'] = page([message(1), message(2)], false)
    renderMessages('/practitioner/messages/12')
    await userEvent.click(await screen.findByRole('button', { name: 'Load earlier messages' }))
    await waitFor(() =>
      expect(within(screen.getByRole('log')).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        expect.stringContaining('Message 1'),
        expect.stringContaining('Message 2'),
        expect.stringContaining('Message 3'),
        expect.stringContaining('Message 4'),
      ]),
    )
    expect(requests()).toContain('GET /conversations/12/messages?before=3')
    // The beginning is reached: nothing more to load.
    expect(screen.queryByRole('button', { name: 'Load earlier messages' })).not.toBeInTheDocument()
  })

  it('marks their unread messages read while it is open', async () => {
    pages[''] = page([message(3)])
    renderMessages('/practitioner/messages/12')
    await log()
    await waitFor(() => expect(requests()).toContain('PATCH /conversations/12/read'))
  })

  it('does not ask to mark anything when nothing is unread', async () => {
    renderMessages('/practitioner/messages/12')
    await log()
    await screen.findByText('Message 2', { exact: false })
    expect(requests()).not.toContain('PATCH /conversations/12/read')
  })

  it('shows a message arriving live, and marks it read at once', async () => {
    const { socket } = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    socket.push('newMessage', message(3, { messageBody: 'Just did my exercises' }))
    expect(await screen.findByText(/Just did my exercises/)).toBeInTheDocument()
    await waitFor(() => expect(requests()).toContain('PATCH /conversations/12/read'))
  })

  it('says "Conversation not found" for one that is not mine or does not exist', async () => {
    conversation = apiError(404, 'Conversation not found')
    renderMessages('/practitioner/messages/12')
    expect(await screen.findByRole('heading', { name: 'Conversation not found' })).toBeInTheDocument()
  })

  it('says "Conversation not found" for an address that is not an id, without asking', async () => {
    renderMessages('/practitioner/messages/abc')
    expect(await screen.findByRole('heading', { name: 'Conversation not found' })).toBeInTheDocument()
    expect(requests().filter((r) => r.includes('abc'))).toEqual([])
  })

  it('offers no box in a read-only conversation, and says why', async () => {
    conversation = summary({ lastMessage: message(2), canSend: false })
    renderMessages('/practitioner/messages/12')
    expect(
      await screen.findByText("You're no longer on a care team together, so this conversation is read-only."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument()
  })
})

describe('writing a message', () => {
  async function ready() {
    const view = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    return view
  }

  it('sends over the socket and waits: "Sending…", the text kept, then the box empties and the message shows', async () => {
    const { socket } = await ready()
    await userEvent.type(box(), 'See you on Monday')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(socket.sent.map(({ event, data }) => [event, data])).toEqual([
      ['sendMessage', { conversationId: 12, messageBody: 'See you on Monday' }],
    ])
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()
    expect(box()).toHaveValue('See you on Monday')
    expect(box()).toHaveAttribute('readonly')

    await socket.answerLast({
      ok: true,
      data: message(3, { senderId: ALEX_ID, messageBody: 'See you on Monday' }),
    })

    await waitFor(() => expect(box()).toHaveValue(''))
    expect(within(screen.getByRole('log')).getAllByRole('listitem').at(-1)).toHaveTextContent(
      'You: See you on Monday',
    )
    // No REST request to send it.
    expect(requests().filter((r) => r.startsWith('POST'))).toEqual([])
  })

  it("shows the server's reason for refusing, and keeps the text", async () => {
    const { socket } = await ready()
    await userEvent.type(box(), 'Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    await socket.answerLast({ ok: false, status: 400, message: ['Something is wrong'] })
    expect(await screen.findByRole('alert')).toHaveTextContent('Something is wrong')
    expect(box()).toHaveValue('Hello')
    // Typing again clears the old error.
    await userEvent.type(box(), '!')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('turns read-only when the server says we are no longer on a care team together', async () => {
    const { socket } = await ready()
    await userEvent.type(box(), 'Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    // From now on the server describes the conversation as read-only.
    conversation = summary({ lastMessage: message(2), canSend: false })
    await socket.answerLast({
      ok: false,
      status: 403,
      message: ["You're no longer on a care team together, so this conversation is read-only"],
    })
    expect(
      await screen.findByText("You're no longer on a care team together, so this conversation is read-only."),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument()
  })

  it('says to try again when no answer comes (and keeps the text)', async () => {
    const { socket } = await ready()
    await userEvent.type(box(), 'Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    socket.sent[0].fail(new Error('operation has timed out'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't send your message. Check your connection and try again.",
    )
    expect(box()).toHaveValue('Hello')
  })

  it('sends with Ctrl+Enter or Cmd+Enter; Enter alone makes a new line', async () => {
    const { socket } = await ready()
    await userEvent.type(box(), 'Line one{Enter}Line two')
    expect(socket.sent).toHaveLength(0)
    expect(box()).toHaveValue('Line one\nLine two')
    await userEvent.keyboard('{Control>}{Enter}{/Control}')
    expect(socket.sent).toHaveLength(1)
    await socket.answerLast({ ok: true, data: message(3, { senderId: ALEX_ID }) })
    await waitFor(() => expect(box()).toHaveValue(''))
    await userEvent.type(box(), 'Again')
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}')
    expect(socket.sent).toHaveLength(2)
  })

  it('cannot send a blank message', async () => {
    await ready()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    await userEvent.type(box(), '   ')
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('counts down near the limit, and cannot send past it', async () => {
    await ready()
    await userEvent.click(box())
    await userEvent.paste('a'.repeat(4600))
    expect(screen.getByText('400 characters left')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
    await userEvent.paste('a'.repeat(402))
    expect(screen.getByText('2 characters over the limit')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('says "Connecting…" and cannot send while the connection is down', async () => {
    renderMessages('/practitioner/messages/12', { connected: false })
    await screen.findByText(/Message 2/)
    await userEvent.type(box(), 'Hello')
    expect(screen.getByRole('button', { name: 'Connecting…' })).toBeDisabled()
  })

  it('does not carry a draft over to another conversation', async () => {
    const { router, queryClient } = await ready()
    await userEvent.type(box(), 'For Pat only')
    // Already cached (as when picked from the list): the page goes straight
    // to the other conversation, with no "Loading…" in between that would
    // have cleared the box anyway — so only the key can clear it.
    queryClient.setQueryData(
      conversationQueryKey(13),
      summary({ id: 13, otherParticipant: { id: 9, firstName: 'Sam', lastName: 'Okafor', avatarUrl: null } }),
    )
    // Conversation 13, with Sam — the same route, another id.
    fakeApi(({ path }) => {
      if (path === '/conversations') return json([])
      if (path === '/conversations/13') {
        return json(summary({ id: 13, otherParticipant: { id: 9, firstName: 'Sam', lastName: 'Okafor', avatarUrl: null } }))
      }
      if (path === '/conversations/13/messages') return json(page([]))
      return undefined
    })
    await act(() => router.navigate('/practitioner/messages/13'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Sam Okafor' })).toBeInTheDocument()
    expect(box()).toHaveValue('')
  })
})