import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiError, json } from '@/sessions/testData'
import { conversationQueryKey } from './api'
import { deleteMessageLabel, seenText } from './messageText'
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

  it('gives a phone a page heading: "Messages", for screen readers, hidden from md up', async () => {
    renderMessages('/practitioner/messages/12')
    await screen.findByRole('heading', { level: 2, name: 'Pat Lee' })
    // jsdom applies no CSS, so both level-1 headings are found here: the
    // list's (hidden on a phone with a conversation open) and the pane's.
    // What decides which one a device shows is the classes, checked here and
    // live in Chromium.
    const headings = screen.getAllByRole('heading', { level: 1, name: 'Messages' })
    const paneHeading = headings.find((h) => h.closest('aside') === null)
    expect(paneHeading).toHaveClass('sr-only', 'md:hidden')
  })

  it('has no extra heading when no conversation is open (the list shows its own)', async () => {
    renderMessages('/practitioner/messages')
    await screen.findByRole('heading', { level: 1, name: 'Messages' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
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

// --- Frontend pass 2: read receipts, the delete window, archiving ------------

const READ = '2031-06-02T09:30:00.000Z'
const mine = (id: number, fields = {}) => message(id, { senderId: ALEX_ID, ...fields })
const items = () => within(screen.getByRole('log')).getAllByRole('listitem')
// hidden: true — while a (modal) dialog is open, Radix marks the rest of the
// page aria-hidden, and a plain role query would never find the button
// behind it: "the button is gone" would pass whether it is or not.
const trash = (id: number) =>
  screen.queryByRole('button', { name: deleteMessageLabel(message(id).sentAt), hidden: true })
const anyTrash = () => screen.queryAllByRole('button', { name: /^Delete your message/, hidden: true })

describe('read receipts', () => {
  it('says "Seen" and when, under my newest message only, once it is read', async () => {
    pages[''] = page([mine(1, { readAt: READ }), message(2, { readAt: READ }), mine(3, { readAt: READ })])
    renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 3/)
    const seen = seenText(READ, message(3).sentAt)
    expect(items().at(-1)).toHaveTextContent(seen)
    // Once: not under my message 1, also read.
    expect(screen.getAllByText(/^Seen /)).toHaveLength(1)
  })

  it('says nothing once they have replied', async () => {
    // The default thread: my message 1 (read), then their reply.
    renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    expect(screen.queryByText(/^Seen /)).not.toBeInTheDocument()
  })

  it('appears live when they read it — and the trash button goes', async () => {
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    const { socket } = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    expect(screen.queryByText(/^Seen /)).not.toBeInTheDocument()
    expect(trash(2)).toBeInTheDocument()

    socket.push('conversationRead', { conversationId: 12, readerId: 6, readAt: READ, messageIds: [2] })

    expect(await screen.findByText(seenText(READ, message(2).sentAt))).toBeInTheDocument()
    expect(trash(2)).not.toBeInTheDocument()
  })
})

describe('deleting a message', () => {
  // Real timers here: the fixtures were sent in 2031, so for today's clock
  // every unread message of mine is well inside its 15 minutes. The window
  // itself is tested below, with a fake clock.

  it('offers it only on my unread messages', async () => {
    pages[''] = page([
      mine(1, { readAt: READ }),
      message(2, { readAt: READ }),
      mine(3),
      mine(4, { messageBody: null, deletedAt: READ }),
    ])
    renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 3/)
    expect(anyTrash().map((b) => b.getAttribute('aria-label'))).toEqual([deleteMessageLabel(message(3).sentAt)])
  })

  it('asks first; Cancel sends nothing and gives the focus back to the button', async () => {
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    const { socket } = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    await userEvent.click(trash(2)!)
    const dialog = await screen.findByRole('dialog', { name: 'Delete this message?' })
    expect(dialog).toHaveTextContent("It will be removed for both of you, and shown as “Message deleted”. This can't be undone.")
    // Which message, quoted.
    expect(dialog).toHaveTextContent('Message 2')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(socket.sent).toEqual([])
    expect(trash(2)).toHaveFocus()
  })

  it('deletes over the socket: "Deleting…", then "Message deleted" — focus on it', async () => {
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    const { socket } = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    await userEvent.click(trash(2)!)
    const dialog = await screen.findByRole('dialog', { name: 'Delete this message?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(socket.sent.map(({ event, data }) => [event, data])).toEqual([
      ['deleteMessage', { conversationId: 12, messageId: 2 }],
    ])
    expect(within(dialog).getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()

    await socket.answerLast({ ok: true, data: mine(2, { messageBody: null, deletedAt: READ }) })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(items().at(-1)).toHaveTextContent('You: Message deleted')
    expect(trash(2)).not.toBeInTheDocument()
    // The button is gone: focus goes to the bubble, not to the top of the page.
    expect(items().at(-1)).toHaveFocus()
    // No REST request to delete it.
    expect(requests().filter((r) => r.startsWith('DELETE'))).toEqual([])
  })

  it("shows the server's words when it is too late — and fetches the thread again", async () => {
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    const { socket } = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    await userEvent.click(trash(2)!)
    const dialog = await screen.findByRole('dialog', { name: 'Delete this message?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    // Meanwhile, Pat read it — the server knows, this tab hadn't heard.
    pages[''] = page([message(1, { readAt: READ }), mine(2, { readAt: READ })])
    const before = requests().filter((r) => r === 'GET /conversations/12/messages').length
    await socket.answerLast({
      ok: false,
      status: 409,
      message: ['This message has already been read, so it can no longer be deleted'],
    })

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'This message has already been read, so it can no longer be deleted',
    )
    await waitFor(() =>
      expect(requests().filter((r) => r === 'GET /conversations/12/messages')).toHaveLength(before + 1),
    )
    // The thread now knows it was read: no button behind the dialog, and
    // the dialog itself stays, still saying why.
    await waitFor(() => expect(trash(2)).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Delete this message?' })).toBeInTheDocument()
  })

  it('says to try again when no answer comes — and a reopened dialog starts clean', async () => {
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    const { socket } = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    await userEvent.click(trash(2)!)
    let dialog = await screen.findByRole('dialog', { name: 'Delete this message?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await act(async () => {
      socket.sent[0].fail(new Error('operation has timed out'))
      await Promise.resolve()
    })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "Couldn't delete your message. Check your connection and try again.",
    )
    // Not a timeout or refusal the server explained: nothing fetched again.
    expect(requests().filter((r) => r === 'GET /conversations/12/messages')).toHaveLength(1)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await userEvent.click(trash(2)!)
    dialog = await screen.findByRole('dialog', { name: 'Delete this message?' })
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says "Connecting…" and cannot delete while the connection is down', async () => {
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    renderMessages('/practitioner/messages/12', { connected: false })
    await screen.findByText(/Message 2/)
    await userEvent.click(trash(2)!)
    const dialog = await screen.findByRole('dialog', { name: 'Delete this message?' })
    expect(within(dialog).getByRole('button', { name: 'Connecting…' })).toBeDisabled()
  })

  it('shows the deletion live when it comes from my other tab', async () => {
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    const { socket } = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    socket.push('messageDeleted', mine(2, { messageBody: null, deletedAt: READ }))
    await waitFor(() => expect(items().at(-1)).toHaveTextContent('You: Message deleted'))
    expect(trash(2)).not.toBeInTheDocument()
  })
})

describe('the delete window', () => {
  // A fake clock. `shouldAdvanceTime`: it still moves with real time, so
  // Testing Library's waits (which poll with timers) keep working.
  // Message 2 was sent at 09:02 — deletable until 09:17.
  const SENT = Date.parse(message(2).sentAt)
  const DEADLINE = SENT + 15 * 60 * 1000

  afterEach(() => {
    vi.useRealTimers()
  })

  function at(moment: number) {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(moment)
  }

  it('takes the button away when the 15 minutes run out — without being asked', async () => {
    at(DEADLINE - 60_000)
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    expect(trash(2)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(61_000)
    })
    expect(trash(2)).not.toBeInTheDocument()
  })

  it('never offers it on a message loaded after its window', async () => {
    at(DEADLINE + 1)
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    expect(trash(2)).not.toBeInTheDocument()
  })

  it('keeps an open dialog when the time runs out under it — the server then answers', async () => {
    at(DEADLINE - 30_000)
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    const { socket } = renderMessages('/practitioner/messages/12')
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
    await screen.findByText(/Message 2/)
    await user.click(trash(2)!)
    const dialog = await screen.findByRole('dialog', { name: 'Delete this message?' })

    act(() => {
      vi.advanceTimersByTime(31_000)
    })

    expect(trash(2)).not.toBeInTheDocument()
    expect(dialog).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(socket.sent.map(({ event }) => event)).toEqual(['deleteMessage'])
  })

  it('gives the focus to the bubble on Cancel once the button is gone', async () => {
    at(DEADLINE - 30_000)
    pages[''] = page([message(1, { readAt: READ }), mine(2)])
    renderMessages('/practitioner/messages/12')
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) })
    await screen.findByText(/Message 2/)
    await user.click(trash(2)!)
    const dialog = await screen.findByRole('dialog', { name: 'Delete this message?' })
    act(() => {
      vi.advanceTimersByTime(31_000)
    })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trash(2)).not.toBeInTheDocument()
    expect(items().at(-1)).toHaveFocus()
  })
})

describe('archiving', () => {
  const archiveButton = () => screen.findByRole('button', { name: 'Archive conversation' })
  const unarchiveButton = () => screen.findByRole('button', { name: 'Unarchive conversation' })

  function serve(handler: (request: { method: string; path: string }) => Response | undefined) {
    const list = [summary({ lastMessage: message(2), unreadCount: 0 })]
    fakeApi((request) => {
      const answer = handler(request)
      if (answer) return answer
      const { method, path } = request
      if (method === 'GET' && path === '/conversations') return json(list)
      if (method === 'GET' && path === '/conversations/12') {
        return conversation instanceof Response ? conversation.clone() : json(conversation)
      }
      if (method === 'GET' && path === '/conversations/12/messages') return json(pages[''])
      return undefined
    })
  }

  it('archives from the header, then goes back to the list — where it waits under archived', async () => {
    serve(({ method, path }) =>
      method === 'PATCH' && path === '/conversations/12/archive'
        ? json(summary({ lastMessage: message(2), archivedAt: READ }))
        : undefined,
    )
    const { router } = renderMessages('/practitioner/messages/12')
    await screen.findByText(/Message 2/)
    await userEvent.click(await archiveButton())

    await waitFor(() => expect(router.state.location.pathname).toBe('/practitioner/messages'))
    // Swapped, not stacked: Back doesn't reopen what was just put away.
    expect(router.state.historyAction).toBe('REPLACE')
    expect(requests()).toContain('PATCH /conversations/12/archive')
    // Written into the cached list (not fetched again).
    expect(await screen.findByText('Every conversation is archived.')).toBeInTheDocument()
    expect(requests().filter((r) => r === 'GET /conversations')).toHaveLength(1)
  })

  it('unarchives from inside an archived conversation, which stays open', async () => {
    conversation = summary({ lastMessage: message(2), archivedAt: READ })
    serve(({ method, path }) =>
      method === 'PATCH' && path === '/conversations/12/unarchive'
        ? json(summary({ lastMessage: message(2), archivedAt: null }))
        : undefined,
    )
    const { router } = renderMessages('/practitioner/messages/12')
    await userEvent.click(await unarchiveButton())
    expect(await archiveButton()).toBeInTheDocument()
    expect(requests()).toContain('PATCH /conversations/12/unarchive')
    expect(router.state.location.pathname).toBe('/practitioner/messages/12')
  })

  it('cannot be pressed again while the first press is on its way', async () => {
    // The request is held open by the test: a promise only it resolves.
    let release: (response: Response) => void = () => {}
    serve(() => undefined)
    const answer = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation((input, init) =>
      init?.method === 'PATCH'
        ? new Promise<Response>((resolve) => {
            release = resolve
          })
        : answer(input, init),
    )
    renderMessages('/practitioner/messages/12')
    const button = await archiveButton()
    await userEvent.click(button)
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(requests().filter((r) => r.startsWith('PATCH'))).toEqual(['PATCH /conversations/12/archive'])
    await act(async () => {
      release(json(summary({ lastMessage: message(2), archivedAt: READ })))
      await Promise.resolve()
    })
  })

  it('says why it could not, and stays', async () => {
    serve(({ method, path }) =>
      method === 'PATCH' && path === '/conversations/12/archive' ? apiError(500, 'Something broke') : undefined,
    )
    const { router } = renderMessages('/practitioner/messages/12')
    await userEvent.click(await archiveButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Something broke')
    expect(router.state.location.pathname).toBe('/practitioner/messages/12')
  })

  it('turns back into Archive when a new message unarchives it', async () => {
    conversation = summary({ lastMessage: message(2), archivedAt: READ })
    serve(() => undefined)
    const { socket } = renderMessages('/practitioner/messages/12')
    await unarchiveButton()
    socket.push('newMessage', message(3, { readAt: READ }))
    expect(await archiveButton()).toBeInTheDocument()
  })

  it('can be archived when read-only too', async () => {
    conversation = summary({ lastMessage: message(2), canSend: false })
    serve(() => undefined)
    renderMessages('/practitioner/messages/12')
    expect(await archiveButton()).toBeInTheDocument()
  })
})