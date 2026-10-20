import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { apiError, json } from '@/sessions/testData'
import { MessageButton } from './MessageButton'
import { MessagesSlot } from './MessagesSlot'
import { fakeApi, fetchMock, renderMessages } from './renderMessages'
import { message, PAT_PERSON, summary } from './testData'

vi.stubGlobal('fetch', fetchMock)

let started: Response

beforeEach(() => {
  fetchMock.mockReset()
  started = json(summary(), 201)
  fakeApi(({ method, path }) => {
    if (method === 'POST' && path === '/conversations') return started
    if (path === '/conversations') return json([summary({ lastMessage: message(1), unreadCount: 3 })])
    if (path === '/conversations/12') return json(summary())
    if (path === '/conversations/12/messages') return json({ messages: [], hasMore: false })
    return undefined
  })
})

const profile = {
  path: '/practitioner/patients/6',
  element: <MessageButton role="practitioner" person={PAT_PERSON} />,
}

describe('MessageButton', () => {
  it('says who it writes to, and opens the conversation with them', async () => {
    const { router } = renderMessages('/practitioner/patients/6', { extraRoutes: [profile] })
    await userEvent.click(screen.getByRole('button', { name: 'Message Pat Lee' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/practitioner/messages/12'))
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({ userId: 6 })
    expect(await screen.findByRole('heading', { level: 2, name: 'Pat Lee' })).toBeInTheDocument()
  })

  it("says why when the conversation can't be started", async () => {
    started = apiError(403, 'You can only message someone on a care team with you')
    renderMessages('/practitioner/patients/6', { extraRoutes: [profile] })
    await userEvent.click(screen.getByRole('button', { name: 'Message Pat Lee' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You can only message someone on a care team with you')
  })
})

describe('MessagesSlot', () => {
  it('shows the unread total as a link to Messages', async () => {
    renderMessages('/practitioner', { extraRoutes: [{ path: '/practitioner', element: <MessagesSlot /> }] })
    expect(await screen.findByRole('link', { name: '3 unread' })).toHaveAttribute('href', '/practitioner/messages')
  })

  it('says Unavailable when the list cannot be loaded', async () => {
    fakeApi(() => apiError(500, 'boom'))
    renderMessages('/practitioner', { extraRoutes: [{ path: '/practitioner', element: <MessagesSlot /> }] })
    expect(await screen.findByText('Unavailable')).toBeInTheDocument()
  })
})