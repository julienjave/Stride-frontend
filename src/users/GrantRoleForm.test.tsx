import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { GrantRoleForm } from './GrantRoleForm'
import { userQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderForm(
  currentRoles: string[],
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      {/* A router: the possible-duplicate warning links to accounts. */}
      <MemoryRouter>
        <GrantRoleForm userId={7} currentRoles={currentRoles} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

async function selectRole(user: ReturnType<typeof userEvent.setup>, roleLabel: string) {
  await user.click(screen.getByRole('combobox', { name: 'Grant role' }))
  await user.click(await screen.findByRole('option', { name: roleLabel }))
}

describe('GrantRoleForm — availability', () => {
  it('shows a message instead of a form when the user already holds every role', () => {
    renderForm(['patient', 'practitioner', 'admin'])

    expect(screen.getByText('This user already holds every role.')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('only offers roles the user does not already hold', async () => {
    const user = userEvent.setup()
    renderForm(['patient'])

    await user.click(screen.getByRole('combobox', { name: 'Grant role' }))

    expect(screen.queryByRole('option', { name: 'Patient' })).not.toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Practitioner' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Admin' })).toBeInTheDocument()
  })

  it('defaults to the first available role and shows its fields immediately', () => {
    // Nothing held yet — 'patient' is first in ALL_ROLES, so its field
    // (date of birth) should show without needing to touch the dropdown.
    renderForm([])

    expect(screen.getByLabelText('Date of birth')).toBeInTheDocument()
  })
})

describe('GrantRoleForm — role-conditional fields', () => {
  it('shows license/specialties/bio for practitioner, hides date of birth', async () => {
    const user = userEvent.setup()
    renderForm(['admin'])

    await selectRole(user, 'Practitioner')

    expect(screen.getByLabelText('License number')).toBeInTheDocument()
    expect(screen.getByLabelText('Specialties (optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Bio (optional)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument()
  })

  it('shows only position for admin', async () => {
    const user = userEvent.setup()
    renderForm(['patient'])

    await selectRole(user, 'Admin')

    expect(screen.getByLabelText('Position (optional)')).toBeInTheDocument()
    expect(screen.queryByLabelText('License number')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument()
  })
})

describe('GrantRoleForm — validation', () => {
  it('blocks submission without a license number for practitioner, never calling the API', async () => {
    const user = userEvent.setup()
    renderForm(['admin'])
    await selectRole(user, 'Practitioner')

    await user.click(screen.getByRole('button', { name: 'Grant role' }))

    expect(
      await screen.findByText('License number is required for practitioners'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('GrantRoleForm — successful submission', () => {
  it('POSTs the correct payload for a practitioner and invalidates the user cache', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(['admin', 'practitioner']), { status: 201 }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const user = userEvent.setup()
    renderForm(['admin'], queryClient)

    await selectRole(user, 'Practitioner')
    await user.type(screen.getByLabelText('License number'), 'LIC-999')
    await user.click(screen.getByRole('button', { name: 'Grant role' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/users/7/roles'),
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    const [, requestInit] = fetchMock.mock.calls[0]
    const body = JSON.parse(requestInit?.body as string) as Record<string, unknown>
    expect(body).toEqual({ role: 'practitioner', licenseNumber: 'LIC-999' })

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: userQueryKey(7),
        exact: true,
      }),
    )
  })

  it('sends specialties as a list — a chip, plus the text still in the box', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(['admin', 'practitioner']), { status: 201 }),
    )
    const user = userEvent.setup()
    renderForm(['admin'])

    await selectRole(user, 'Practitioner')
    await user.type(screen.getByLabelText('License number'), 'LIC-999')
    await user.type(screen.getByLabelText('Specialties (optional)'), 'Sports,Neuro')
    await user.click(screen.getByRole('button', { name: 'Grant role' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][1]?.body).toBe(
      '{"role":"practitioner","licenseNumber":"LIC-999","specialties":["Sports","Neuro"]}',
    )
  })

  // Inside a <form>, Enter normally submits it. In the tag box it must
  // only add the tag (TagInput's preventDefault) — granting a role by
  // accident, half-filled, would be a real bug.
  it('Enter in the specialties box adds a tag, and does not submit the form', async () => {
    const user = userEvent.setup()
    renderForm(['admin'])

    await selectRole(user, 'Practitioner')
    await user.type(screen.getByLabelText('License number'), 'LIC-999')
    await user.type(screen.getByLabelText('Specialties (optional)'), 'Sports{Enter}')

    expect(screen.getByRole('button', { name: 'Remove Sports' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  // A refused entry is explained right away, on Enter — not only when the
  // form is submitted.
  it('explains a refused specialty as soon as Enter is pressed', async () => {
    const user = userEvent.setup()
    renderForm(['admin'])

    await selectRole(user, 'Practitioner')
    await user.type(screen.getByLabelText('Specialties (optional)'), 'Sports{Enter}sports{Enter}')

    expect(screen.getByText('"sports" is already in the list')).toBeInTheDocument()
    expect(screen.getByLabelText('Specialties (optional)')).toHaveValue('sports')
  })

  it('shows the backend error message on failure (e.g. role already held)', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 409, message: ['User already has the "admin" role'] }),
        { status: 409 },
      ),
    )
    const user = userEvent.setup()
    renderForm(['patient'])
    await selectRole(user, 'Admin')
    await user.click(screen.getByRole('button', { name: 'Grant role' }))

    expect(
      await screen.findByText('User already has the "admin" role'),
    ).toBeInTheDocument()
  })

  // No answer at all: the form says which action failed.
  it('says the role could not be granted when no answer comes', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderForm(['patient'])
    await selectRole(user, 'Admin')
    await user.click(screen.getByRole('button', { name: 'Grant role' }))

    expect(await screen.findByText(/^Could not grant that role\.$/)).toBeInTheDocument()
  })
})

// Granting the patient role makes a new patient record: the same
// possible-duplicate warning as creating one (decisions §27, pass 2).
describe('GrantRoleForm — a possible duplicate', () => {
  const warning = {
    statusCode: 409,
    message: ['A patient with this name and date of birth may already be in Stride.'],
    error: 'ConflictException',
    timestamp: '2031-01-01T00:00:00.000Z',
    path: '/users/7/roles',
    reason: 'possible_duplicate',
    matches: [{ id: 12, firstName: 'Sam', lastName: 'Okafor', isActive: true, clinics: [] }],
  }

  it('shows the matches, then grants anyway with the go-ahead', async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        typeof init?.body === 'string' && init.body.includes('allowPossibleDuplicate')
          ? new Response(JSON.stringify(['admin', 'patient']), { status: 201 })
          : new Response(JSON.stringify(warning), { status: 409 }),
      ),
    )
    const user = userEvent.setup()
    renderForm(['admin'])
    await user.type(screen.getByLabelText('Date of birth'), '1985-09-09')
    await user.click(screen.getByRole('button', { name: 'Grant role' }))

    const heading = await screen.findByRole('heading', {
      name: 'This patient may already be in Stride',
    })
    expect(heading).toHaveFocus()
    expect(
      screen.getByRole('link', { name: 'Sam Okafor (opens in a new tab)' }),
    ).toHaveAttribute('href', '/admin/users/12')

    await user.click(screen.getByRole('button', { name: 'Grant the patient role anyway' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls.map(([, init]) => init?.body)).toEqual([
      '{"role":"patient","dateOfBirth":"1985-09-09"}',
      '{"role":"patient","dateOfBirth":"1985-09-09","allowPossibleDuplicate":true}',
    ])
  })

  // Any other refusal keeps its plain words.
  it('shows any other refusal as before', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 409,
          message: ['User already has the patient role'],
          error: 'ConflictException',
          timestamp: '2031-01-01T00:00:00.000Z',
          path: '/users/7/roles',
        }),
        { status: 409 },
      ),
    )
    const user = userEvent.setup()
    renderForm(['admin'])
    await user.type(screen.getByLabelText('Date of birth'), '1985-09-09')
    await user.click(screen.getByRole('button', { name: 'Grant role' }))

    expect(await screen.findByText('User already has the patient role')).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})