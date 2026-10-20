import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { PractitionerProfilePage } from './PractitionerProfilePage'
import { ALEX, HARBOUR, PAT, RIVERSIDE, SAM, clinic, json, member, program, urlOf } from './testData'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// What each endpoint answers; tests change them before rendering.
let team: () => Response
let programs: () => Response
let clinics: Record<number, () => Response>

const ALEX_MEMBER = member(ALEX, {
  practitioner: {
    specialties: ['Knee rehabilitation', 'Post-surgery'],
    bio: 'Twelve years of knees.\nAsk me about stairs.',
  },
  sharedClinics: [RIVERSIDE, HARBOUR],
})

beforeEach(() => {
  fetchMock.mockReset()
  team = () => json([ALEX_MEMBER, member(SAM, { isActive: false, endsAt: '2031-02-20T10:00:00.000Z' })])
  programs = () =>
    json([
      program(11, { title: 'Knee Rehab' }),
      program(12, { title: 'Back Basics', assignedBy: SAM.id, assigner: SAM }),
      program(13, { title: 'Knee Rehab — first block', status: 'completed', startDate: '2031-03-02', endDate: '2031-05-20' }),
    ])
  clinics = {
    1: () =>
      json(
        clinic(RIVERSIDE, {
          phone: '555-0100',
          website: 'riverside.example',
          addressLine1: '12 River Street',
          addressCity: 'Springfield',
          addressPostalCode: '62701',
          addressCountry: 'US',
        }),
      ),
    2: () => json(clinic(HARBOUR)),
  }
  fetchMock.mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/users/6/care-team?includeEnded=true')) return Promise.resolve(team())
    if (url.endsWith('/assigned-programs')) return Promise.resolve(programs())
    const match = /\/clinics\/(\d+)$/.exec(url)
    if (match && clinics[Number(match[1])]) return Promise.resolve(clinics[Number(match[1])]())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
})

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/patient/team/:practitionerId" element={<PractitionerProfilePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function paths() {
  return fetchMock.mock.calls.map(([input]) => new URL(urlOf(input)).pathname).sort()
}

async function section(name: string) {
  const heading = await screen.findByRole('heading', { name, level: 2 })
  return heading.closest('section')!
}

describe('PractitionerProfilePage', () => {
  it('shows who they are: name, specialties, bio — under the way back to the list', async () => {
    renderAt('/patient/team/3')

    expect(await screen.findByRole('heading', { name: 'Alex Chen', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to My team' })).toHaveAttribute('href', '/patient/team')
    const specialties = screen.getByRole('list', { name: 'Specialties' })
    expect(within(specialties).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Knee rehabilitation',
      'Post-surgery',
    ])
    // The bio's own line break is kept (whitespace-pre-line).
    const bio = screen.getByText(/Twelve years of knees/)
    expect(bio.textContent).toBe('Twelve years of knees.\nAsk me about stairs.')
    expect(bio).toHaveClass('whitespace-pre-line')
  })

  // Phase 5. Starting the conversation is MessageButton's own test.
  it('offers to message them', async () => {
    renderAt('/patient/team/3')
    expect(await screen.findByRole('button', { name: 'Message Alex Chen' })).toBeInTheDocument()
  })

  it("lists where they see the patient, with each clinic's contact details", async () => {
    renderAt('/patient/team/3')
    const clinicsSection = await section('Where they see you')

    const riverside = within(clinicsSection).getByRole('heading', { name: 'Riverside Physio', level: 3 })
      .closest('li')!
    expect(await within(riverside).findByText('12 River Street')).toBeInTheDocument()
    expect(within(riverside).getByText('62701 Springfield')).toBeInTheDocument()
    expect(within(riverside).getByText('United States')).toBeInTheDocument()
    expect(within(riverside).getByRole('link', { name: '555-0100' })).toHaveAttribute('href', 'tel:555-0100')
    expect(within(riverside).getByRole('link', { name: 'contact@clinic1.example' })).toHaveAttribute(
      'href',
      'mailto:contact@clinic1.example',
    )
    const website = within(riverside).getByRole('link', { name: 'riverside.example' })
    expect(website).toHaveAttribute('href', 'https://riverside.example')
    expect(website).toHaveAttribute('target', '_blank')
    expect(website).toHaveAttribute('rel', 'noreferrer')

    // Harbour has no phone, address or website: only its email.
    const harbour = within(clinicsSection).getByRole('heading', { name: 'Harbour Sports Clinic', level: 3 })
      .closest('li')!
    expect(await within(harbour).findByRole('link', { name: 'contact@clinic2.example' })).toBeInTheDocument()
    expect(within(harbour).getAllByRole('link')).toHaveLength(1)
    expect(harbour.querySelector('address')).toBeNull()
  })

  it('shows a website that is not a web address as plain text', async () => {
    clinics[2] = () => json(clinic(HARBOUR, { website: 'javascript:alert(1)' }))
    renderAt('/patient/team/3')
    const clinicsSection = await section('Where they see you')
    expect(await within(clinicsSection).findByText('javascript:alert(1)')).toBeInTheDocument()
    expect(within(clinicsSection).queryByRole('link', { name: 'javascript:alert(1)' })).not.toBeInTheDocument()
  })

  it("keeps the clinic's name when its details fail to load", async () => {
    clinics[2] = () => json({ statusCode: 500, message: ['Boom'] }, 500)
    renderAt('/patient/team/3')
    const clinicsSection = await section('Where they see you')
    const harbour = within(clinicsSection).getByRole('heading', { name: 'Harbour Sports Clinic' }).closest('li')!
    expect(await within(harbour).findByText("Couldn't load this clinic's contact details.")).toBeInTheDocument()
  })

  it('lists the programs they assigned — current, then past — each linking to its page', async () => {
    renderAt('/patient/team/3')
    const programsSection = await section('Programs from them')

    const links = await within(programsSection).findAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Knee Rehab', '/patient/sessions/programs/11'],
      ['Knee Rehab — first block', '/patient/sessions/programs/13'],
    ])
    expect(
      within(programsSection).getByText(
        `Completed · ended ${formatCalendarDate('2031-05-20')} · ran from ${formatCalendarDate('2031-03-02')}`,
      ),
    ).toBeInTheDocument()
    expect(within(programsSection).queryByText('Back Basics')).not.toBeInTheDocument()
    expect(within(programsSection).queryByText(/No programs from/)).not.toBeInTheDocument()
  })

  it('says so when they assigned none, and leaves out an empty bio and specialties', async () => {
    team = () => json([member(ALEX)])
    programs = () => json([program(12, { assignedBy: SAM.id, assigner: SAM })])
    clinics = { 1: () => json(clinic(RIVERSIDE)) }
    renderAt('/patient/team/3')

    const programsSection = await section('Programs from them')
    expect(await within(programsSection).findByText('No programs from Alex yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Specialties' })).not.toBeInTheDocument()
    expect(document.querySelector('.whitespace-pre-line')).toBeNull()
  })

  it.each([
    ['a past member', '/patient/team/4'],
    ['someone never on the team', '/patient/team/99'],
    ['an address that is not an id', '/patient/team/abc'],
  ])('tells %s apart: not on your care team, with the way back', async (_who, path) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: 'Not on your care team', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to My team' })).toHaveAttribute('href', '/patient/team')
    // Nothing of a profile is asked for.
    expect(paths().filter((path) => path !== '/users/6/care-team')).toEqual([])
  })

  it('reports a failed load of the team', async () => {
    team = () => json({ statusCode: 500, message: ['Boom'] }, 500)
    renderAt('/patient/team/3')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't load your care team. Try refreshing the page.",
    )
    expect(screen.queryByRole('heading', { name: 'Not on your care team' })).not.toBeInTheDocument()
    // The way back is there in every state of the page.
    expect(screen.getByRole('link', { name: 'Back to My team' })).toHaveAttribute('href', '/patient/team')
  })
})