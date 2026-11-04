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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { PatientsListPage } from './PatientsListPage'
import { errorResponse, expectLoadError, retryThenExpectFocusOn } from '@/common/loadFailureAssertions'
import { expectSkeleton } from '@/common/loadingAssertions'

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
  isActive: true,
  clinics: [riverside],
}
const robin = {
  id: 8,
  firstName: 'Robin',
  lastName: 'Silva',
  avatarUrl: null,
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1992-01-05' },
  isActive: true,
  clinics: [riverside, harbour],
}
const pat = {
  id: 6,
  firstName: 'Pat',
  lastName: 'Lee',
  avatarUrl: null,
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1988-04-12' },
  isActive: true,
  clinics: [riverside],
}
// On my care team, account deactivated (decisions §22): in the answer
// because the page asks WITH the deactivated ones.
const dee = {
  id: 9,
  firstName: 'Dee',
  lastName: 'Moss',
  avatarUrl: null,
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1980-02-03' },
  isActive: false,
  clinics: [harbour],
}
const abe = { ...dee, id: 10, firstName: 'Abe', lastName: 'Adams', clinics: [riverside] }

function respondWithPatients(patients: object[]) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(patients), { status: 200 }))
}

// The signed-in practitioner, put straight into the cache the way the app
// has it once /auth/me has answered — only `clinics` matters to this page.
function renderRoster(myClinics: object[] = [riverside], navigationState?: unknown) {
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
      <MemoryRouter initialEntries={[{ pathname: '/practitioner/patients', state: navigationState }]}>
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
    expectSkeleton('Loading your patients…')
    // WITH the deactivated ones: the page splits them off itself, and the
    // switch says how many there are without a second request.
    expect(urlOf(fetchMock.mock.calls[0][0]).endsWith('/users?includeInactive=true')).toBe(true)
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
    // Robin also attends Harbour, which isn't one of my clinics: shown too —
    // and SAID to be someone else's, in words a screen reader reads out.
    const badges = within(row).getByRole('list', { name: 'Clinics' })
    expect(within(badges).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Riverside Physio',
      'Harbour Sports Clinic (not one of your clinics)',
    ])
  })

  // Roadmap Phase 6.5, "Roster badges".
  const KEY = "Dashed outline: a clinic you don't work at — the patient is also seen there."

  it('draws a clinic I do not work at with a dashed outline, mine as before', async () => {
    respondWithPatients([robin])
    renderRoster([riverside])

    const row = (await screen.findByText('Robin Silva')).closest('a')!
    const [mine, other] = within(within(row).getByRole('list', { name: 'Clinics' })).getAllByRole(
      'listitem',
    )
    expect(other).toHaveClass('border-dashed')
    expect(mine).not.toHaveClass('border-dashed')
    // The words are visually hidden, never only a style: `sr-only`.
    expect(within(other).getByText('(not one of your clinics)')).toHaveClass('sr-only')
    expect(within(mine).queryByText(/not one of your clinics/)).not.toBeInTheDocument()
  })

  it('shows the key once, under the list, when a dashed badge is on screen', async () => {
    respondWithPatients([robin, jo])
    renderRoster([riverside])
    await screen.findByText('Robin Silva')
    expect(screen.getAllByText(KEY)).toHaveLength(1)
  })

  it('shows no key, and no dashed badge, when every clinic shown is mine', async () => {
    respondWithPatients([robin, jo])
    // Robin's Harbour IS mine for a practitioner in both clinics.
    renderRoster([riverside, harbour])
    await screen.findByText('Robin Silva')
    expect(screen.queryByText(KEY)).not.toBeInTheDocument()
    expect(screen.queryByText(/not one of your clinics/)).not.toBeInTheDocument()
  })

  it('shows the key for a deactivated patient only once their row is shown', async () => {
    // Dee (deactivated) attends Harbour, not mine; Jo (active) only Riverside.
    respondWithPatients([jo, dee])
    const user = userEvent.setup()
    renderRoster([riverside])
    await screen.findByText('Jo Novak')
    expect(screen.queryByText(KEY)).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show 1 deactivated patient' }))
    expect(screen.getByText(KEY)).toBeInTheDocument()
    const deactivatedList = screen.getByRole('list', { name: 'Deactivated patients' })
    expect(within(deactivatedList).getByText('(not one of your clinics)')).toBeInTheDocument()
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

  // --- Deactivated patients (decisions §22) ---------------------------------

  // The names in one named list, in order.
  const namesIn = (label: string) =>
    within(screen.getByRole('list', { name: label }))
      .getAllByRole('link')
      .map((link) => link.querySelector('p')?.textContent)

  it('keeps deactivated patients behind a switch, off on arrival', async () => {
    respondWithPatients([jo, dee, pat, abe])
    const user = userEvent.setup()
    renderRoster()

    await screen.findByText('Jo Novak')
    expect(namesIn('Patients')).toEqual(['Pat Lee', 'Jo Novak'])
    expect(screen.queryByText('Dee Moss')).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Deactivated patients' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show 2 deactivated patients' }))
    // Their own list, under the active one, sorted, each row saying so —
    // and still a link: their record is still mine to read.
    expect(namesIn('Deactivated patients')).toEqual(['Abe Adams', 'Dee Moss'])
    const row = screen.getByRole('link', { name: /Dee Moss/ })
    expect(row).toHaveAttribute('href', '/practitioner/patients/9')
    expect(within(row).getByText('Account deactivated')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Patients' })).queryByText('Account deactivated'),
    ).not.toBeInTheDocument()
    expect(
      screen
        .getByRole('list', { name: 'Patients' })
        .compareDocumentPosition(screen.getByRole('list', { name: 'Deactivated patients' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await user.click(screen.getByRole('checkbox', { name: 'Show 2 deactivated patients' }))
    expect(screen.queryByText('Dee Moss')).not.toBeInTheDocument()
  })

  it('offers no switch when nobody is deactivated', async () => {
    respondWithPatients([jo, pat])
    renderRoster()
    await screen.findByText('Jo Novak')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('applies the clinic filter to the deactivated patients too', async () => {
    respondWithPatients([jo, robin, dee, abe])
    const user = userEvent.setup()
    renderRoster([riverside, harbour])
    await screen.findByText('Jo Novak')
    expect(screen.getByRole('checkbox', { name: 'Show 2 deactivated patients' })).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Clinic' }))
    await user.click(await screen.findByRole('option', { name: 'Harbour Sports Clinic' }))
    expect(screen.getByRole('checkbox', { name: 'Show 1 deactivated patient' })).toBeInTheDocument()
  })

  // Every patient deactivated: not "No patients yet" (untrue), not the
  // clinic filter's sentence — the switch is right under it.
  it('says so when none of my patients has an active account', async () => {
    respondWithPatients([dee])
    renderRoster()

    expect(await screen.findByText('None of your patients has an active account.')).toBeInTheDocument()
    expect(screen.queryByText('No patients yet')).not.toBeInTheDocument()
    expect(screen.queryByText(/None of your patients attend/)).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Show 1 deactivated patient' })).toBeInTheDocument()
  })

  it('explains an empty roster and how to fill it', async () => {
    respondWithPatients([])
    renderRoster()

    expect(await screen.findByText('No patients yet')).toBeInTheDocument()
    expect(screen.queryByText('None of your patients has an active account.')).not.toBeInTheDocument()
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

  it('says when the list could not be loaded, and why; a retry that works focuses the heading', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }))
    renderRoster()
    await expectLoadError('your patients')
    await retryThenExpectFocusOn(user, { level: 1, name: 'My patients' })
    expect(await screen.findByText('No patients yet')).toBeInTheDocument()
  })

  // Until 2026-10-31 the patient page handed "You left Pat Lee's care team."
  // over in navigation state, and this page drew it — again after every
  // reload, since the browser keeps history state. It's a snackbar now,
  // raised by the patient page (decisions §33): an old entry in the history
  // still holding such state draws nothing here.
  it('draws nothing from navigation state (the confirmation is a snackbar now)', async () => {
    respondWithPatients([])
    renderRoster([riverside], { notice: "You left Pat Lee's care team." })
    await screen.findByText('No patients yet')
    expect(screen.queryByText("You left Pat Lee's care team.")).not.toBeInTheDocument()
  })
})