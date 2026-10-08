import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { InvitePatientPage } from './InvitePatientPage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// A fetch call's URL as a string — see CreateUserPage.test.tsx on why
// String(input) would be wrong for a Request object.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const riverside = { id: 1, name: 'Riverside Physio' }
const harbour = { id: 2, name: 'Harbour Sports Clinic' }

const invitedPatient = {
  id: 40,
  firstName: 'Marie',
  lastName: 'Martin',
  email: 'marie@example.com',
  roles: ['patient'],
  clinics: [riverside],
  invitation: {
    id: 900,
    status: 'pending',
    expiresAt: '2026-10-15T10:00:00.000Z',
    emailSent: true,
  },
}

function respondToInvite(status: number, body: object) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

beforeEach(() => {
  fetchMock.mockReset()
  respondToInvite(201, invitedPatient)
})

function renderInvitePage({
  myClinics = [riverside],
  url = '/practitioner/patients/invite',
}: { myClinics?: object[]; url?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(currentUserQueryKey, {
    id: 2,
    firstName: 'Alex',
    lastName: 'Moreau',
    activeRole: 'practitioner',
    roles: ['practitioner'],
    clinics: myClinics,
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <InvitePatientPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

async function fillTheRest(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Email'), 'marie@example.com')
  await user.type(screen.getByLabelText('Date of birth'), '1985-04-12')
}

function inviteCalls() {
  return fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
}

describe('InvitePatientPage — the form', () => {
  it('starts with the names searched for', () => {
    renderInvitePage({ url: '/practitioner/patients/invite?firstName=Marie&lastName=de%20la%20Cruz' })
    expect(screen.getByLabelText('First name')).toHaveValue('Marie')
    expect(screen.getByLabelText('Last name')).toHaveValue('de la Cruz')
  })

  it('invites into my only clinic without asking, with the exact payload', async () => {
    const user = userEvent.setup()
    renderInvitePage({ url: '/practitioner/patients/invite?firstName=Marie&lastName=Martin' })

    expect(screen.getByText('Riverside Physio')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

    await fillTheRest(user)
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    await waitFor(() => expect(inviteCalls()).toHaveLength(1))
    const [url, init] = inviteCalls()[0]
    expect(urlOf(url)).toMatch(/\/users$/)
    expect(init?.body).toBe(
      '{"role":"patient","firstName":"Marie","lastName":"Martin","email":"marie@example.com","dateOfBirth":"1985-04-12","clinicId":1}',
    )
  })

  it('asks which clinic when I have several, and requires one', async () => {
    const user = userEvent.setup()
    renderInvitePage({
      myClinics: [riverside, harbour],
      url: '/practitioner/patients/invite?firstName=Marie&lastName=Martin',
    })
    await fillTheRest(user)

    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    expect(await screen.findByText('Select a clinic for this patient')).toBeInTheDocument()
    expect(inviteCalls()).toHaveLength(0)

    await user.click(screen.getByRole('combobox', { name: 'Clinic' }))
    await user.click(await screen.findByRole('option', { name: 'Harbour Sports Clinic' }))
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    await waitFor(() => expect(inviteCalls()).toHaveLength(1))
    expect(JSON.parse(inviteCalls()[0][1]?.body as string)).toMatchObject({ clinicId: 2 })
  })

  it('shows each missing field’s message and sends nothing', async () => {
    const user = userEvent.setup()
    renderInvitePage()
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Date of birth is required')).toBeInTheDocument()
    expect(inviteCalls()).toHaveLength(0)
  })

  it('explains, instead of a form, when I belong to no clinic', () => {
    renderInvitePage({ myClinics: [] })
    expect(
      screen.getByText(
        "You don't belong to any clinic yet, so you can't invite patients. Ask an admin to add you to your clinic.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send invitation' })).not.toBeInTheDocument()
  })
})

describe('InvitePatientPage — after inviting', () => {
  async function invite(user: ReturnType<typeof userEvent.setup>, url?: string) {
    const rendered = renderInvitePage({
      url: url ?? '/practitioner/patients/invite?firstName=Marie&lastName=Martin',
    })
    // Cached lists, as if the practitioner had just seen them — seeded
    // BEFORE the submit, so the invitation's response can't arrive first.
    rendered.queryClient.setQueryData(['users-list', false], [])
    rendered.queryClient.setQueryData(['directory-patients', ''], [])
    await fillTheRest(user)
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    return rendered
  }

  it('confirms the invitation and that the patient is mine, and refreshes both lists', async () => {
    const user = userEvent.setup()
    const { queryClient } = await invite(user)

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Invited Marie Martin (marie@example.com). They're in your patients, and you're on their care team.",
    )
    expect(screen.getByRole('link', { name: 'Go to my patients' })).toHaveAttribute(
      'href',
      '/practitioner/patients',
    )
    // Both lists marked stale: refetched as soon as they're on screen.
    expect(queryClient.getQueryState(['users-list', false])?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(['directory-patients', ''])?.isInvalidated).toBe(true)
  })

  it('"Invite another patient" brings back an EMPTY form — not the previous names', async () => {
    const user = userEvent.setup()
    await invite(user)
    await screen.findByRole('status')

    await user.click(screen.getByRole('button', { name: 'Invite another patient' }))

    expect(screen.getByLabelText('First name')).toHaveValue('')
    expect(screen.getByLabelText('Last name')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // No errors from the reset itself.
    expect(screen.queryByText(/is required/)).not.toBeInTheDocument()
  })

  it('explains a taken email in terms the practitioner can act on', async () => {
    respondToInvite(409, {
      statusCode: 409,
      message: ['A user with this email already exists'],
    })
    const user = userEvent.setup()
    await invite(user)

    expect(
      await screen.findByText(
        'This email already belongs to a Stride account — perhaps at another clinic, or deactivated. Ask an admin to give you access (add the patient to your clinic, or reactivate the account), then add them from the search. Otherwise, check the email.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('A user with this email already exists')).not.toBeInTheDocument()
  })

  it('shows any other refusal in the backend’s own words', async () => {
    respondToInvite(403, {
      statusCode: 403,
      message: ['You can only add patients to a clinic you belong to'],
    })
    const user = userEvent.setup()
    await invite(user)

    expect(
      await screen.findByText('You can only add patients to a clinic you belong to'),
    ).toBeInTheDocument()
  })
})