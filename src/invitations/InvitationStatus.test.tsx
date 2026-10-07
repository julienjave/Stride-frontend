import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InvitationStatus } from './InvitationStatus'
import type { InvitationSummary } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// See CreateUserPage.test.tsx for why a Request needs .url, not toString().
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

const EXPIRES_AT = '2026-10-14T10:00:00.000Z'
const NEW_EXPIRES_AT = '2026-10-15T10:00:00.000Z'
// Same formatting as the component, so the tests hold in any locale.
const dateOf = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(iso))

const admin = { id: 1, firstName: 'Ada', lastName: 'Admin' }

function invitation(overrides: Partial<InvitationSummary> = {}): InvitationSummary {
  return {
    id: 10,
    status: 'pending',
    createdAt: '2026-10-07T10:00:00.000Z',
    expiresAt: EXPIRES_AT,
    acceptedAt: null,
    revokedAt: null,
    invitedBy: admin,
    revokedBy: null,
    ...overrides,
  }
}

// A tiny fake of the three endpoints, with state: `history` is what GET
// answers, and send / revoke change it the way the backend does — so a
// test can check that the component shows the NEW state afterwards, which
// only happens if it really fetched the history again.
let history: InvitationSummary[]
let sendResponse: () => Promise<Response>
let revokeResponse: () => Promise<Response>

beforeEach(() => {
  fetchMock.mockReset()
  history = [invitation()]
  sendResponse = () => {
    const sent = invitation({ id: 11, expiresAt: NEW_EXPIRES_AT })
    // A resend closes the open invitation and adds the new one.
    history = [sent, ...history.map((i) => ({ ...i, status: 'revoked' as const, revokedBy: admin }))]
    return jsonResponse({ ...sent, emailSent: true }, 201)
  }
  revokeResponse = () => {
    history = [{ ...history[0], status: 'revoked', revokedBy: admin }, ...history.slice(1)]
    return jsonResponse(history[0])
  }
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/users/7/invitations/revoke') && method === 'POST') return revokeResponse()
    if (url.endsWith('/users/7/invitations') && method === 'POST') return sendResponse()
    if (url.endsWith('/users/7/invitations') && method === 'GET') return jsonResponse(history)
    throw new Error(`Unexpected ${method} ${url}`)
  })
})

function renderStatus(props: Partial<{ isActive: boolean }> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <InvitationStatus
        userId={7}
        userName="Jane Doe"
        email="jane@example.com"
        isActive={props.isActive ?? true}
      />
    </QueryClientProvider>,
  )
}

function callsTo(method: string, path: string) {
  return fetchMock.mock.calls.filter(
    ([input, init]) => urlOf(input).endsWith(path) && (init?.method ?? 'GET') === method,
  )
}

async function section() {
  return screen.findByRole('region', { name: 'Invitation' })
}

describe('InvitationStatus', () => {
  describe('what it shows', () => {
    it('a pending invitation: who sent it, until when it works, and both actions', async () => {
      renderStatus()

      const region = await section()
      expect(within(region).getByText('Pending')).toBeInTheDocument()
      expect(
        within(region).getByText(`Sent by Ada Admin. The link works until ${dateOf(EXPIRES_AT)}.`),
      ).toBeInTheDocument()
      expect(within(region).getByRole('button', { name: 'Send again' })).toBeInTheDocument()
      expect(within(region).getByRole('button', { name: 'Revoke' })).toBeInTheDocument()
    })

    it('an accepted invitation: no actions (the person has a password)', async () => {
      history = [invitation({ status: 'accepted', acceptedAt: '2026-10-08T10:00:00.000Z' })]
      renderStatus()

      const region = await section()
      expect(within(region).getByText('Accepted — the account is set up.')).toBeInTheDocument()
      expect(within(region).queryByRole('button')).not.toBeInTheDocument()
    })

    it('an expired invitation: offers a new one, nothing to revoke', async () => {
      history = [invitation({ status: 'expired' })]
      renderStatus()

      const region = await section()
      expect(
        within(region).getByText(
          `The invitation expired on ${dateOf(EXPIRES_AT)}. The account can't be used until a new one is sent.`,
        ),
      ).toBeInTheDocument()
      expect(
        within(region).getByRole('button', { name: 'Send a new invitation' }),
      ).toBeInTheDocument()
      expect(within(region).queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument()
    })

    it('a revoked invitation: who revoked it, and a new one offered', async () => {
      history = [invitation({ status: 'revoked', revokedAt: '2026-10-08T10:00:00.000Z', revokedBy: admin })]
      renderStatus()

      const region = await section()
      expect(
        within(region).getByText(
          "The invitation was revoked by Ada Admin. The account can't be used until a new one is sent.",
        ),
      ).toBeInTheDocument()
      expect(
        within(region).getByRole('button', { name: 'Send a new invitation' }),
      ).toBeInTheDocument()
    })

    it('only the NEWEST invitation (the list is newest first)', async () => {
      history = [invitation({ status: 'expired' }), invitation({ id: 9, status: 'revoked' })]
      renderStatus()

      expect(within(await section()).getByText('Expired')).toBeInTheDocument()
    })

    it('on a deactivated account: no sending, and why', async () => {
      history = [invitation({ status: 'expired' })]
      renderStatus({ isActive: false })

      const region = await section()
      expect(
        within(region).getByText('Reactivate the account to send a new invitation.'),
      ).toBeInTheDocument()
      expect(within(region).queryByRole('button')).not.toBeInTheDocument()
    })

    it('nothing at all for an account with no invitation history', async () => {
      history = []
      const { container } = renderStatus()

      await waitFor(() => expect(callsTo('GET', '/users/7/invitations')).toHaveLength(1))
      await waitFor(() => expect(container).toBeEmptyDOMElement())
    })

    it('a loading line, then an error if the history cannot be loaded', async () => {
      fetchMock.mockImplementation(() =>
        jsonResponse({ statusCode: 500, message: ['Internal server error'] }, 500),
      )
      renderStatus()

      expect(screen.getByText('Loading invitation…')).toBeInTheDocument()
      expect(
        await screen.findByText("Couldn't load the invitation: Internal server error"),
      ).toBeInTheDocument()
    })
  })

  describe('sending again', () => {
    it('sends, confirms the email went out, and shows the NEW invitation', async () => {
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Send again' }))

      expect(await screen.findByRole('status')).toHaveTextContent(
        'A new invitation was emailed to jane@example.com.',
      )
      // The new expiry is on screen: the history was fetched again.
      expect(
        await screen.findByText(
          `Sent by Ada Admin. The link works until ${dateOf(NEW_EXPIRES_AT)}.`,
        ),
      ).toBeInTheDocument()
      expect(callsTo('POST', '/users/7/invitations')).toHaveLength(1)
    })

    it('says so — amber, not an error — when the email could not be sent', async () => {
      sendResponse = () => jsonResponse({ ...invitation({ id: 11 }), emailSent: false }, 201)
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Send again' }))

      const status = await screen.findByRole('status')
      expect(status).toHaveTextContent(
        "A new invitation was created, but the email couldn't be sent. Try sending it again.",
      )
      expect(status).toHaveClass('bg-amber-500/10')
    })

    it("shows the backend's message when sending is refused", async () => {
      sendResponse = () =>
        jsonResponse(
          {
            statusCode: 409,
            message: ['This account is already set up: its owner has chosen a password.'],
          },
          409,
        )
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Send again' }))

      expect(
        await screen.findByText(
          'This account is already set up: its owner has chosen a password.',
        ),
      ).toHaveClass('text-destructive')
    })
  })

  describe('revoking', () => {
    it('asks first, then revokes and shows the revoked state', async () => {
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Revoke' }))
      const dialog = await screen.findByRole('dialog', { name: "Revoke Jane Doe's invitation?" })
      // Nothing happens until it's confirmed.
      expect(callsTo('POST', '/users/7/invitations/revoke')).toHaveLength(0)

      await user.click(within(dialog).getByRole('button', { name: 'Revoke invitation' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(
        await screen.findByText(
          "The invitation was revoked by Ada Admin. The account can't be used until a new one is sent.",
        ),
      ).toBeInTheDocument()
      expect(callsTo('POST', '/users/7/invitations/revoke')).toHaveLength(1)
    })

    // After a revoke the dialog unmounts anyway (no longer pending), so
    // "it closed" alone proves little: the open/closed STATE must be reset
    // too, or the next pending invitation brings the dialog back by itself.
    it('does not reopen the dialog when a new invitation is sent after revoking', async () => {
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Revoke' }))
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: 'Revoke invitation',
        }),
      )
      await user.click(await screen.findByRole('button', { name: 'Send a new invitation' }))

      expect(await screen.findByText('Pending')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('Cancel closes the dialog without revoking', async () => {
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Revoke' }))
      await user.click(await screen.findByRole('button', { name: 'Cancel' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(callsTo('POST', '/users/7/invitations/revoke')).toHaveLength(0)
    })

    // "A new invitation was emailed" would describe a link that no longer
    // works.
    it('clears the confirmation of an earlier send', async () => {
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Send again' }))
      expect(await screen.findByRole('status')).toBeInTheDocument()

      await user.click(await screen.findByRole('button', { name: 'Revoke' }))
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: 'Revoke invitation',
        }),
      )

      expect(await screen.findByText('Revoked')).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('shows a refusal inside the dialog, which stays open', async () => {
      revokeResponse = () =>
        jsonResponse(
          { statusCode: 404, message: ['This account has no open invitation to revoke'] },
          404,
        )
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Revoke' }))
      const dialog = await screen.findByRole('dialog')
      await user.click(within(dialog).getByRole('button', { name: 'Revoke invitation' }))

      expect(
        await within(dialog).findByText('This account has no open invitation to revoke'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})