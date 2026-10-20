import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ALEX, BLAKE, member, SAM } from '@/team/testData'
import { apiError, json } from '@/sessions/testData'
import { fakeApi, fetchMock, renderMessages, requests } from './renderMessages'
import { PAT_ID, summary } from './testData'

vi.stubGlobal('fetch', fetchMock)

const patient = (id: number, firstName: string, lastName: string) => ({
  id,
  firstName,
  lastName,
  avatarUrl: null,
  email: `${firstName.toLowerCase()}@example.com`,
})

let started: Response

beforeEach(() => {
  fetchMock.mockReset()
  started = json(summary({ id: 40 }), 201)
  fakeApi(({ method, path }) => {
    if (path === '/conversations' && method === 'GET') return json([])
    if (path === '/conversations' && method === 'POST') return started
    // A practitioner's patients.
    if (path === '/users') return json([patient(7, 'Zoe', 'Young'), patient(6, 'Pat', 'Lee')])
    // A patient's care team (current and past).
    if (path === `/users/${PAT_ID}/care-team?includeEnded=true`) {
      return json([
        member(ALEX, { practitioner: { specialties: ['Knee rehabilitation'] } }),
        member(SAM, { isActive: false, endsAt: '2031-04-01T00:00:00.000Z' }),
        member(BLAKE),
      ])
    }
    if (path === '/conversations/40') return json(summary({ id: 40 }))
    if (path === '/conversations/40/messages') return json({ messages: [], hasMore: false })
    return undefined
  })
})

// The names on the buttons, in order (each button also holds the avatar's
// initials, hidden from screen readers but present in textContent).
const names = (container: HTMLElement) =>
  within(container)
    .getAllByRole('button')
    .map((button) => button.querySelector('span.block.font-medium')?.textContent)

async function open() {
  await userEvent.click(await screen.findByRole('button', { name: 'New message' }))
  return screen.findByRole('dialog', { name: 'New message' })
}

describe('New message', () => {
  it("offers a practitioner their patients, by name — and asks for them only once it's open", async () => {
    renderMessages('/practitioner/messages')
    await screen.findByRole('button', { name: 'New message' })
    expect(requests()).not.toContain('GET /users')
    const dialog = await open()
    const list = await within(dialog).findByRole('list', { name: 'Your patients' })
    expect(names(list)).toEqual(['Pat Lee', 'Zoe Young'])
    // Only the practitioner's list is asked for.
    expect(requests().filter((r) => r.includes('care-team'))).toEqual([])
  })

  it('opens the conversation with the one picked, and closes', async () => {
    const { router } = renderMessages('/practitioner/messages')
    const dialog = await open()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Pat Lee' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/practitioner/messages/40'))
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(post?.[1]?.body as string)).toEqual({ userId: 6 })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('filters by name', async () => {
    renderMessages('/practitioner/messages')
    const dialog = await open()
    await within(dialog).findByRole('button', { name: 'Pat Lee' })
    await userEvent.type(within(dialog).getByRole('searchbox', { name: 'Filter by name' }), 'zo')
    expect(names(within(dialog).getByRole('list'))).toEqual(['Zoe Young'])
    await userEvent.clear(within(dialog).getByRole('searchbox'))
    await userEvent.type(within(dialog).getByRole('searchbox'), 'nobody')
    expect(within(dialog).getByText('Nobody matches "nobody".')).toBeInTheDocument()
  })

  it('offers a patient the CURRENT members of their care team, with their specialties', async () => {
    renderMessages('/patient/messages', { user: { id: PAT_ID, activeRole: 'patient' } })
    const dialog = await open()
    const list = await within(dialog).findByRole('list', { name: 'Your care team' })
    expect(names(list)).toEqual(expect.arrayContaining(['Alex Chen', 'Blake Martin']))
    expect(names(list)).toHaveLength(2)
    // A patient's own team — never GET /users, which would refuse them.
    expect(requests()).not.toContain('GET /users')
    expect(within(list).getByRole('button', { name: /Alex Chen/ })).toHaveTextContent('Knee rehabilitation')
  })

  it("says why, when the conversation can't be started", async () => {
    started = apiError(403, 'You can only message someone on a care team with you')
    renderMessages('/practitioner/messages')
    const dialog = await open()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Pat Lee' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'You can only message someone on a care team with you',
    )
  })

  it('says so when there is nobody to write to', async () => {
    fakeApi(({ path }) => {
      if (path === '/conversations') return json([])
      if (path === '/users') return json([])
      return undefined
    })
    renderMessages('/practitioner/messages')
    const dialog = await open()
    expect(await within(dialog).findByText("You aren't on any patient's care team yet.")).toBeInTheDocument()
  })
})