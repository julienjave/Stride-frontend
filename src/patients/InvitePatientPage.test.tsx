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
import { render, screen, waitFor, within } from '@testing-library/react'
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
// The possible-duplicate warning (decisions §27, pass 2): a 409 with
// `reason: 'possible_duplicate'` is a question, not an error — shown with
// what the practitioner may know, and a way to go ahead.
describe('InvitePatientPage — a possible duplicate', () => {
  const marieInMyClinic = {
    id: 7,
    firstName: 'Marie',
    lastName: 'Martin',
    avatarUrl: null,
    dateOfBirth: '1985-04-12',
    sharedClinics: [riverside],
    onMyCareTeam: false,
  }

  function duplicateBody(inYourClinics: object[], elsewhere: boolean) {
    return {
      statusCode: 409,
      message: ['A patient with this name and date of birth may already be in Stride.'],
      error: 'ConflictException',
      timestamp: '2031-01-01T00:00:00.000Z',
      path: '/users',
      reason: 'possible_duplicate',
      inYourClinics,
      elsewhere,
    }
  }

  // The first invitation answers the warning; one sent with the go-ahead
  // creates the patient; joining a care team answers 201.
  function answerWithWarning(body: object) {
    fetchMock.mockImplementation((input, init) => {
      const url = urlOf(input)
      if (url.includes('/care-team')) {
        return Promise.resolve(new Response('{"id":1}', { status: 201 }))
      }
      const goAhead = typeof init?.body === 'string' && init.body.includes('allowPossibleDuplicate')
      return Promise.resolve(
        goAhead
          ? new Response(JSON.stringify(invitedPatient), { status: 201 })
          : new Response(JSON.stringify(body), { status: 409 }),
      )
    })
  }

  async function sendMarie(user: ReturnType<typeof userEvent.setup>) {
    renderInvitePage({ url: '/practitioner/patients/invite?firstName=Marie&lastName=Martin' })
    await fillTheRest(user)
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))
    return screen.findByRole('heading', { name: 'This patient may already be in Stride' })
  }

  it('shows a match from my clinics as a directory row, focused, instead of an error', async () => {
    const user = userEvent.setup()
    answerWithWarning(duplicateBody([marieInMyClinic], false))

    const heading = await sendMarie(user)

    expect(heading).toHaveFocus()
    const notice = screen.getByRole('region', { name: 'This patient may already be in Stride' })
    expect(
      within(notice).getByText(
        'In your clinics — if this is them, add them to your patients instead of inviting:',
      ),
    ).toBeInTheDocument()
    // The directory's row: who (with the clinic we share) and its action.
    expect(within(notice).getByText('Marie Martin')).toBeInTheDocument()
    expect(within(notice).getByText('Riverside Physio')).toBeInTheDocument()
    expect(within(notice).getByRole('button', { name: 'Add to my patients' })).toBeInTheDocument()
    // No "elsewhere" sentence, and not the email-taken explanation.
    expect(within(notice).queryByText(/can't see/)).not.toBeInTheDocument()
    expect(screen.queryByText(/already belongs to a Stride account/)).not.toBeInTheDocument()
  })

  it('says only that a match exists when I can see none', async () => {
    const user = userEvent.setup()
    answerWithWarning(duplicateBody([], true))

    await sendMarie(user)

    expect(
      screen.getByText(
        "You can't see the existing account: it's at a clinic you don't work at, or it has been deactivated. Check with an admin before inviting — they can give you access to it, or reactivate it.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('says "also" when there are both kinds of match', async () => {
    const user = userEvent.setup()
    answerWithWarning(duplicateBody([marieInMyClinic], true))

    await sendMarie(user)

    expect(
      screen.getByText(/^There is also a match you can't see: it's at a clinic/),
    ).toBeInTheDocument()
  })

  it('invites anyway when asked — the same person, with the go-ahead', async () => {
    const user = userEvent.setup()
    answerWithWarning(duplicateBody([], true))
    await sendMarie(user)

    await user.click(screen.getByRole('button', { name: 'Invite Marie Martin anyway' }))

    expect(await screen.findByText(/Invited Marie Martin/)).toBeInTheDocument()
    expect(inviteCalls()).toHaveLength(2)
    expect(inviteCalls()[1][1]?.body).toBe(
      '{"role":"patient","firstName":"Marie","lastName":"Martin","email":"marie@example.com","dateOfBirth":"1985-04-12","clinicId":1,"allowPossibleDuplicate":true}',
    )
  })

  // Edited after the warning: the button still names the person warned
  // about, and sends THOSE values — a normal submit checks the new ones.
  it('goes ahead with the person the warning was about, not later edits', async () => {
    const user = userEvent.setup()
    answerWithWarning(duplicateBody([], true))
    await sendMarie(user)

    await user.clear(screen.getByLabelText('First name'))
    await user.type(screen.getByLabelText('First name'), 'Mara')
    await user.click(screen.getByRole('button', { name: 'Invite Marie Martin anyway' }))

    await waitFor(() => expect(inviteCalls()).toHaveLength(2))
    expect(JSON.parse(inviteCalls()[1][1]?.body as string)).toMatchObject({
      firstName: 'Marie',
      allowPossibleDuplicate: true,
    })
  })

  // A second warning (the names edited, sent again) is a new notice: its
  // heading takes focus again — the person just pressed Send.
  it('focuses the warning again when a new one comes', async () => {
    const user = userEvent.setup()
    answerWithWarning(duplicateBody([], true))
    await sendMarie(user)

    await user.type(screen.getByLabelText('Last name'), 'e')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    await waitFor(() => expect(inviteCalls()).toHaveLength(2))
    expect(
      await screen.findByRole('button', { name: 'Invite Marie Martine anyway' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'This patient may already be in Stride' }),
    ).toHaveFocus()
  })

  it('adds the existing patient instead — and creates no account', async () => {
    const user = userEvent.setup()
    answerWithWarning(duplicateBody([marieInMyClinic], false))
    await sendMarie(user)

    const notice = screen.getByRole('region', { name: 'This patient may already be in Stride' })
    await user.click(within(notice).getByRole('button', { name: 'Add to my patients' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Add to my patients' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Marie Martin is now in your patients — no new account was created.',
    )
    expect(inviteCalls().map(([input]) => urlOf(input))).toEqual([
      'http://localhost:3000/users',
      'http://localhost:3000/users/7/care-team',
    ])
  })

  // The route's other 409 has no reason: its own words, no warning.
  it('still explains an email that is already taken', async () => {
    const user = userEvent.setup()
    respondToInvite(409, {
      statusCode: 409,
      message: ['A user with this email already exists'],
      error: 'ConflictException',
      timestamp: '2031-01-01T00:00:00.000Z',
      path: '/users',
    })
    renderInvitePage({ url: '/practitioner/patients/invite?firstName=Marie&lastName=Martin' })
    await fillTheRest(user)
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText(/already belongs to a Stride account/)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'This patient may already be in Stride' }),
    ).not.toBeInTheDocument()
  })
})