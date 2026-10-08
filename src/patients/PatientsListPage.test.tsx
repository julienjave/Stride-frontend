import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { PatientsListPage } from './PatientsListPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

// A fetch call's URL as a string — see CreateUserPage.test.tsx on why
// String(input) would be wrong for a Request object.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const riverside = { id: 1, name: 'Riverside Physio' }
const harbour = { id: 2, name: 'Harbour Sports Clinic' }

// GET /users as a practitioner: my care-team patients, in NO particular
// order (the backend's query has no ORDER BY) — deliberately unsorted here.
const jo = {
  id: 7,
  firstName: 'Jo',
  lastName: 'Novak',
  avatarUrl: null,
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1975-09-30' },
  clinics: [riverside],
}
const robin = {
  id: 8,
  firstName: 'Robin',
  lastName: 'Silva',
  avatarUrl: null,
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1992-01-05' },
  clinics: [riverside, harbour],
}
const pat = {
  id: 6,
  firstName: 'Pat',
  lastName: 'Lee',
  avatarUrl: null,
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1988-04-12' },
  clinics: [riverside],
}

function respondWithPatients(patients: object[]) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(patients), { status: 200 }))
}

// The signed-in practitioner, put straight into the cache the way the app
// has it once /auth/me has answered — only `clinics` matters to this page.
function renderRoster(myClinics: object[] = [riverside]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(currentUserQueryKey, {
    id: 3,
    firstName: 'Sam',
    lastName: 'Okafor',
    activeRole: 'practitioner',
    roles: ['practitioner'],
    clinics: myClinics,
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practitioner/patients']}>
        <PatientsListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// The patients' names in the order the list shows them.
function shownNames() {
  return screen
    .getAllByRole('listitem')
    .filter((item) => item.querySelector('a'))
    .map((item) => item.querySelector('p')?.textContent)
}

describe('PatientsListPage', () => {
  it('shows a loading state, then asks GET /users for my patients', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderRoster()
    expect(screen.getByText('Loading your patients…')).toBeInTheDocument()
    expect(urlOf(fetchMock.mock.calls[0][0])).toMatch(/\/users$/)
  })

  it('lists my patients sorted by last name, each linking to their page', async () => {
    respondWithPatients([jo, robin, pat])
    renderRoster()

    expect(await screen.findByText('Pat Lee')).toBeInTheDocument()
    expect(shownNames()).toEqual(['Pat Lee', 'Jo Novak', 'Robin Silva'])
    expect(screen.getByRole('link', { name: /Robin Silva/ })).toHaveAttribute(
      'href',
      '/practitioner/patients/8',
    )
  })

  it('shows each patient’s date of birth and ALL their clinics — mine or not', async () => {
    respondWithPatients([robin])
    renderRoster([riverside])

    const row = (await screen.findByText('Robin Silva')).closest('a')!
    // Formatted by the same helper the page uses, so the expected text
    // follows the machine's locale ("January 5, 1992", "5 janvier 1992"…).
    expect(
      within(row).getByText(`Born ${formatCalendarDate('1992-01-05')}`),
    ).toBeInTheDocument()
    // Robin also attends Harbour, which isn't one of my clinics: shown too.
    const badges = within(row).getByRole('list', { name: 'Clinics' })
    expect(within(badges).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Riverside Physio',
      'Harbour Sports Clinic',
    ])
  })

  it('offers no clinic filter to a practitioner with one clinic', async () => {
    respondWithPatients([jo])
    renderRoster([riverside])
    await screen.findByText('Jo Novak')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('filters by clinic for a practitioner with two clinics', async () => {
    respondWithPatients([jo, robin, pat])
    const user = userEvent.setup()
    renderRoster([riverside, harbour])
    await screen.findByText('Jo Novak')

    await user.click(screen.getByRole('combobox', { name: 'Clinic' }))
    await user.click(await screen.findByRole('option', { name: 'Harbour Sports Clinic' }))

    expect(shownNames()).toEqual(['Robin Silva'])

    await user.click(screen.getByRole('combobox', { name: 'Clinic' }))
    await user.click(await screen.findByRole('option', { name: 'All my clinics' }))
    expect(shownNames()).toEqual(['Pat Lee', 'Jo Novak', 'Robin Silva'])
  })

  it('says so when no patient attends the chosen clinic', async () => {
    respondWithPatients([jo])
    const user = userEvent.setup()
    renderRoster([riverside, harbour])
    await screen.findByText('Jo Novak')

    await user.click(screen.getByRole('combobox', { name: 'Clinic' }))
    await user.click(await screen.findByRole('option', { name: 'Harbour Sports Clinic' }))

    expect(
      screen.getByText('None of your patients attend Harbour Sports Clinic.'),
    ).toBeInTheDocument()
    // Not the "no patients at all" state: I do have patients.
    expect(screen.queryByText('No patients yet')).not.toBeInTheDocument()
  })

  it('explains an empty roster and how to fill it', async () => {
    respondWithPatients([])
    renderRoster()

    expect(await screen.findByText('No patients yet')).toBeInTheDocument()
    expect(
      screen.getByText(
        "Patients appear here once you're on their care team: find someone already in your clinic, or invite a new patient.",
      ),
    ).toBeInTheDocument()
    // Two ways to the add page: the header button and the empty state's.
    const addLinks = screen.getAllByRole('link', { name: 'Add patient' })
    expect(addLinks).toHaveLength(2)
    for (const link of addLinks) {
      expect(link).toHaveAttribute('href', '/practitioner/patients/add')
    }
  })

  it('says when the list could not be loaded', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, message: ['Boom'] }), { status: 500 }),
    )
    renderRoster()
    expect(
      await screen.findByText("Couldn't load your patients. Try refreshing."),
    ).toBeInTheDocument()
  })
})