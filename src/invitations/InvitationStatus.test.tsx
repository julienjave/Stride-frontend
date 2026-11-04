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
import { InvitationStatus } from './InvitationStatus'
import type { InvitationSummary } from './types'
import { adminMetricsQueryKey } from '@/app/home/admin/api'
import { expectLoading } from '@/common/loadingAssertions'

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
    emailSentAt: '2026-10-07T10:00:01.000Z',
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

function renderStatus(
  props: Partial<{ isActive: boolean }> = {},
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
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

    // The live-testing find: the account page said "Sent by …" for an
    // invitation whose email had failed, because nothing recorded it.
    it("a pending invitation whose email couldn't be sent: says so, in amber, and offers to send again", async () => {
      history = [invitation({ emailSentAt: null })]
      renderStatus()

      const region = await section()
      const sentence = within(region).getByText(
        "Created by Ada Admin, but the email couldn't be sent, so the link hasn't reached them. Send it again.",
      )
      expect(sentence).toHaveClass('bg-amber-500/10')
      expect(within(region).queryByText(/^Sent by/)).not.toBeInTheDocument()
      expect(within(region).getByRole('button', { name: 'Send again' })).toBeInTheDocument()
    })

    it('a pending invitation whose email went out: plain text, not amber', async () => {
      renderStatus()

      const sentence = within(await section()).getByText(/^Sent by Ada Admin\./)
      expect(sentence).toHaveClass('text-muted-foreground')
      expect(sentence).not.toHaveClass('bg-amber-500/10')
    })

    // Once it's no longer pending, the email no longer matters: an expired
    // invitation reads the same whether or not its email went out.
    it('an expired invitation reads the same whether or not its email went out', async () => {
      history = [invitation({ status: 'expired', emailSentAt: null })]
      renderStatus()

      const region = await section()
      expect(
        within(region).getByText(
          `The invitation expired on ${dateOf(EXPIRES_AT)}. The account can't be used until a new one is sent.`,
        ),
      ).not.toHaveClass('bg-amber-500/10')
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

      expectLoading('Loading the invitation…')
      const section = within(await screen.findByRole('region', { name: 'Invitation' }))
      expect(section.getByRole('alert')).toHaveTextContent(
        /^Couldn't load the invitation\. Something went wrong on our side\. Try again in a moment\.$/,
      )
    })

    it('"Try again" that works: the invitation, with focus on the section\'s heading', async () => {
      const user = userEvent.setup()
      let fail = true
      fetchMock.mockImplementation(() =>
        fail
          ? jsonResponse({ statusCode: 500, message: ['Internal server error'] }, 500)
          : jsonResponse([invitation()]),
      )
      renderStatus()
      await screen.findByRole('alert')
      fail = false
      await user.click(screen.getByRole('button', { name: 'Try again' }))
      expect(await screen.findByText('Pending')).toBeInTheDocument()
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Invitation' })).toHaveFocus(),
      )
    })
  })

  describe('sending again', () => {
    it("replaces the \"couldn't be sent\" warning once the new email goes out", async () => {
      history = [invitation({ emailSentAt: null })]
      const user = userEvent.setup()
      renderStatus()

      await user.click(await screen.findByRole('button', { name: 'Send again' }))

      expect(
        await screen.findByText(
          `Sent by Ada Admin. The link works until ${dateOf(NEW_EXPIRES_AT)}.`,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText(/couldn't be sent, so the link/)).not.toBeInTheDocument()
    })

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

  // A send or a revoke can take the account off the admin home's
  // "Invitations to send again" (2026-10-25): the home's numbers and the
  // users lists are marked stale (refreshAttention). Seeded, unobserved
  // entries: an invalidated query nobody shows stays marked.
  describe("the admin home's numbers", () => {
    function seededClient() {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      queryClient.setQueryData(adminMetricsQueryKey, {})
      queryClient.setQueryData(['users-list', 'attention', 'invitations-to-send-again'], [])
      return queryClient
    }
    const stale = (queryClient: QueryClient) => [
      queryClient.getQueryState(adminMetricsQueryKey)?.isInvalidated,
      queryClient.getQueryState(['users-list', 'attention', 'invitations-to-send-again'])
        ?.isInvalidated,
    ]

    it('are marked stale after a new invitation is sent', async () => {
      const queryClient = seededClient()
      const user = userEvent.setup()
      renderStatus({}, queryClient)
      expect(stale(queryClient)).toEqual([false, false])

      await user.click(await screen.findByRole('button', { name: 'Send again' }))

      await waitFor(() => expect(stale(queryClient)).toEqual([true, true]))
    })

    it('are marked stale after a revoke', async () => {
      const queryClient = seededClient()
      const user = userEvent.setup()
      renderStatus({}, queryClient)

      await user.click(await screen.findByRole('button', { name: 'Revoke' }))
      const dialog = await screen.findByRole('dialog', { name: "Revoke Jane Doe's invitation?" })
      await user.click(within(dialog).getByRole('button', { name: 'Revoke invitation' }))

      await waitFor(() => expect(stale(queryClient)).toEqual([true, true]))
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