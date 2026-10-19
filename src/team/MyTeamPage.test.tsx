import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatMomentDate } from '@/common/formatMomentDate'
import { MyTeamPage } from './MyTeamPage'
import { PractitionerProfilePage } from './PractitionerProfilePage'
import { viewedPractitionerState } from './teamReturn'
import { ALEX, AVERY, BLAKE, HARBOUR, PAT, RIVERSIDE, SAM, json, member, urlOf } from './testData'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// What GET /users/6/care-team?includeEnded=true answers; tests set it.
let team: () => Response

beforeEach(() => {
  fetchMock.mockReset()
  team = () => json([])
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/users/6/care-team?includeEnded=true')) return Promise.resolve(team())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
})

// Both Team pages, as routes.tsx mounts them, so a test can go from one to
// the other.
function renderPage(path: string | { pathname: string; state: unknown } = '/patient/team') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/patient/team" element={<MyTeamPage />} />
          <Route path="/patient/team/:practitionerId" element={<PractitionerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function paths() {
  return fetchMock.mock.calls.map(([input]) => {
    const url = new URL(urlOf(input))
    return url.pathname + url.search
  })
}

// A member's card: the list item holding their name's heading.
async function card(name: string) {
  const heading = await screen.findByRole('heading', { name, level: 2 })
  return heading.closest('li')!
}

const EMPTY_TEXT = /No practitioner is on your care team right now/

describe('MyTeamPage', () => {
  it('shows a card per current member — specialties, clinics, since when, who added them — linking to their profile', async () => {
    team = () =>
      json([
        member(ALEX, {
          practitioner: { specialties: ['Knee rehabilitation', 'Post-surgery'] },
          sharedClinics: [HARBOUR, RIVERSIDE],
        }),
        member(SAM, { createdBy: ALEX, startedAt: '2031-04-10T10:00:00.000Z' }),
      ])
    renderPage()

    const alex = await card('Alex Chen')
    expect(within(alex).getByRole('link', { name: 'Alex Chen' })).toHaveAttribute('href', '/patient/team/3')
    expect(within(alex).getByText('Knee rehabilitation · Post-surgery')).toBeInTheDocument()
    expect(within(alex).getByText('Harbour Sports Clinic, Riverside Physio')).toBeInTheDocument()
    expect(
      within(alex).getByText(`On your team since ${formatMomentDate('2031-03-02T10:00:00.000Z')}`),
    ).toBeInTheDocument()
    // Alex joined himself: nobody else to name.
    expect(within(alex).queryByText(/Added by/)).not.toBeInTheDocument()

    const sam = await card('Sam Okafor')
    expect(within(sam).getByRole('link', { name: 'Sam Okafor' })).toHaveAttribute('href', '/patient/team/4')
    expect(within(sam).getByText('Added by Alex Chen')).toBeInTheDocument()

    // Longest-serving first, and nothing else on the page.
    const list = screen.getByRole('list', { name: 'Your care team' })
    expect(within(list).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Alex Chen', 'Sam Okafor'])
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    // One request: the team WITH its history.
    expect(paths()).toEqual(['/users/6/care-team?includeEnded=true'])
  })

  it('keeps past members behind "Show N past members": who, when, ended by whom — no link', async () => {
    team = () =>
      json([
        member(ALEX),
        member(BLAKE, {
          isActive: false,
          sharedClinics: [],
          startedAt: '2031-01-05T10:00:00.000Z',
          endsAt: '2031-02-20T10:00:00.000Z',
          endedBy: AVERY,
        }),
      ])
    renderPage()
    const user = userEvent.setup()

    await card('Alex Chen')
    expect(screen.queryByText('Blake Martin')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Past members' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show 1 past member' }))

    const past = screen.getByRole('list', { name: 'Past members' })
    expect(within(past).getByText('Blake Martin')).toBeInTheDocument()
    expect(
      within(past).getByText(
        `On your team from ${formatMomentDate('2031-01-05T10:00:00.000Z')} to ${formatMomentDate('2031-02-20T10:00:00.000Z')}`,
      ),
    ).toBeInTheDocument()
    expect(within(past).getByText('Ended by Avery Admin')).toBeInTheDocument()
    expect(within(past).queryByRole('link')).not.toBeInTheDocument()
    // Not a current member: no card of their own.
    expect(screen.queryByRole('heading', { name: 'Blake Martin' })).not.toBeInTheDocument()
  })

  it('says so when nobody is on the team now — and still offers the history', async () => {
    team = () =>
      json([member(SAM, { isActive: false, sharedClinics: [], endsAt: '2031-02-20T10:00:00.000Z' })])
    renderPage()

    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Your care team' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Show 1 past member' })).toBeInTheDocument()
  })

  it('says so for an empty team with no history, and offers no switch', async () => {
    renderPage()
    expect(await screen.findByText(EMPTY_TEXT)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  // The round trip: list → a profile → "Back to My team" → focus on the
  // card the patient opened. Sam is the SECOND card, so focus landing on
  // the first one (or staying at the top) fails the test.
  it('puts focus back on the card of the profile the patient comes back from', async () => {
    team = () => json([member(ALEX), member(SAM, { startedAt: '2031-04-10T10:00:00.000Z' })])
    // The profile's own requests: its programs and its clinic.
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (url.endsWith('/users/6/care-team?includeEnded=true')) return Promise.resolve(team())
      if (url.endsWith('/assigned-programs')) return Promise.resolve(json([]))
      if (url.endsWith('/clinics/1')) return Promise.resolve(json({ ...RIVERSIDE, email: 'r@example.com' }))
      return Promise.reject(new Error(`unexpected request: ${url}`))
    })
    renderPage()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Sam Okafor' }))
    expect(await screen.findByRole('heading', { name: 'Sam Okafor', level: 1 })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Back to My team' }))

    // An effect does it, after the list is on screen: wait for it.
    const samLink = await screen.findByRole('link', { name: 'Sam Okafor' })
    await vi.waitFor(() => expect(samLink).toHaveFocus())
  })

  // Navigation state survives a reload of the entry, but the cache doesn't:
  // the list renders "Loading…" first, and focus must still follow once the
  // cards arrive (the effect re-runs when the data is in).
  it('still puts focus back after a reload, once the list has loaded', async () => {
    team = () => json([member(ALEX), member(SAM, { startedAt: '2031-04-10T10:00:00.000Z' })])
    renderPage({ pathname: '/patient/team', state: viewedPractitionerState(SAM.id) })

    expect(screen.getByText('Loading your care team…')).toBeInTheDocument()
    const samLink = await screen.findByRole('link', { name: 'Sam Okafor' })
    await vi.waitFor(() => expect(samLink).toHaveFocus())
  })

  it('leaves focus alone when the list is opened any other way', async () => {
    team = () => json([member(ALEX)])
    renderPage()
    await screen.findByRole('link', { name: 'Alex Chen' })
    // Give an effect every chance to run before checking it didn't.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(document.body).toHaveFocus()
  })

  it('reports a failed load', async () => {
    team = () => json({ statusCode: 500, message: ['Boom'] }, 500)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load your care team. Try refreshing the page.",
    )
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument()
  })
})