import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { json, urlOf } from '@/medical-files/testData'
import { formatLinkMoment } from './recordsExportRules'
import { RecordsExportLinksSection } from './RecordsExportLinksSection'
import type { RecordsExportLinkSummary } from './types'

// The admin's "Email a download link" on a patient's user page (decisions
// §20, pass 3). The links' wording is recordsExportRules.test.ts's; here,
// what the section does with it.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const LINKS_PATH = '/users/7/records-export-links'

function link(id: number, extra: Partial<RecordsExportLinkSummary> = {}): RecordsExportLinkSummary {
  return {
    id,
    status: 'expired',
    createdAt: `2031-03-0${id}T09:00:00.000Z`,
    expiresAt: `2031-03-0${id + 3}T09:00:00.000Z`,
    emailSentAt: `2031-03-0${id}T09:00:01.000Z`,
    usedAt: null,
    replacedAt: null,
    dateOfBirthFailures: 0,
    sentBy: { id: 1, firstName: 'Avery', lastName: 'Admin' },
    ...extra,
  }
}

const OPEN = link(5, { status: 'open' })
const NEW_LINK = link(6, { status: 'open' })

interface Sent {
  method: string
  path: string
}
let sent: Sent[]
// What GET answers (it changes as the test sends links), and what POST does.
let list: () => Response | Promise<Response>
let post: () => Response | Promise<Response>

beforeEach(() => {
  sent = []
  list = () => json([OPEN, link(2, { status: 'used', usedAt: '2031-03-03T10:00:00.000Z' })])
  post = () => json({ ...NEW_LINK, emailSent: true }, 201)
  fetchMock.mockReset()
  fetchMock.mockImplementation((input, init) => {
    const request = { method: init?.method ?? 'GET', path: new URL(urlOf(input)).pathname }
    sent.push(request)
    if (request.path !== LINKS_PATH) return Promise.reject(new Error(`unexpected ${request.path}`))
    return Promise.resolve(request.method === 'POST' ? post() : list())
  })
})

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
  const section = (patientId: number) => (
    <QueryClientProvider client={queryClient}>
      <RecordsExportLinksSection patientId={patientId} firstName="Pat" lastName="Lee" email="pat@example.com" />
    </QueryClientProvider>
  )
  const { rerender } = render(section(7))
  // The same app (one cache) showing another patient's page.
  return { showPatient: (patientId: number) => rerender(section(patientId)) }
}

const region = () => screen.getByRole('region', { name: 'Health record copy' })
const linkItems = async () =>
  within(await screen.findByRole('list', { name: 'Links sent' })).getAllByRole('listitem')

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(region()).getByRole('button', { name: 'Email a download link' }))
  return screen.findByRole('dialog', { name: 'Email Pat Lee a download link?' })
}

describe('RecordsExportLinksSection — the links sent', () => {
  it('says what it does, and lists every link, newest first, in words', async () => {
    renderSection()
    expect(
      within(region()).getByText(
        'Email Pat a link to download their health record — their medical file, programs and sessions, as a PDF. The link works once, for 72 hours, and asks for their date of birth first.',
      ),
    ).toBeInTheDocument()

    const items = await linkItems()
    expect(items.map((item) => item.firstChild?.textContent)).toStrictEqual(['Not used yet', 'Downloaded'])
    expect(items[0]).toHaveTextContent(`Works until ${formatLinkMoment(OPEN.expiresAt)}.`)
    expect(items[1]).toHaveTextContent(`Downloaded on ${formatLinkMoment('2031-03-03T10:00:00.000Z')}.`)
    expect(sent).toStrictEqual([{ method: 'GET', path: LINKS_PATH }])
  })

  // Amber for the one case to act on: a link the patient never received.
  it('marks a link whose email never left — and only that one', async () => {
    list = () => json([link(5, { status: 'open', emailSentAt: null }), link(2)])
    renderSection()
    const [failed, expired] = await linkItems()
    expect(failed).toHaveTextContent(/The patient never received this link — send another one\.$/)
    expect(failed).toHaveClass('bg-amber-500/10')
    expect(expired).not.toHaveClass('bg-amber-500/10')
  })

  it('lists a single link as a list', async () => {
    list = () => json([OPEN])
    renderSection()
    expect((await linkItems()).map((item) => item.firstChild?.textContent)).toStrictEqual(['Not used yet'])
    expect(within(region()).queryByText('No link has been sent yet.')).not.toBeInTheDocument()
  })

  // Each patient's links are cached under their own id: going from one
  // patient's page to another's (fresh for 30 s) must not show the first
  // patient's links.
  it("shows each patient's own links", async () => {
    fetchMock.mockImplementation((input) => {
      const path = new URL(urlOf(input)).pathname
      sent.push({ method: 'GET', path })
      return Promise.resolve(json(path === LINKS_PATH ? [OPEN] : []))
    })
    const { showPatient } = renderSection()
    await linkItems()

    showPatient(8)
    expect(await within(region()).findByText('No link has been sent yet.')).toBeInTheDocument()
    expect(sent.map((request) => request.path)).toStrictEqual([LINKS_PATH, '/users/8/records-export-links'])
  })

  it('says when no link has been sent — and only then', async () => {
    list = () => json([])
    renderSection()
    expect(await within(region()).findByText('No link has been sent yet.')).toBeInTheDocument()
    expect(within(region()).queryByText('Loading the links sent…')).not.toBeInTheDocument()
  })

  it('shows it is loading, without saying there are none', async () => {
    renderSection()
    expect(within(region()).getByText('Loading the links sent…')).toBeInTheDocument()
    expect(within(region()).queryByText('No link has been sent yet.')).not.toBeInTheDocument()
    await linkItems()
    expect(within(region()).queryByText('No link has been sent yet.')).not.toBeInTheDocument()
  })

  it("says when the links couldn't be loaded — and Try again asks again", async () => {
    const user = userEvent.setup()
    list = () => json({ statusCode: 500, message: ['Boom'], error: 'Error' }, 500)
    renderSection()
    expect(await within(region()).findByRole('alert')).toHaveTextContent(/^Couldn't load the links sent\.$/)
    // Sending still works without the list.
    expect(within(region()).getByRole('button', { name: 'Email a download link' })).toBeEnabled()

    list = () => json([])
    await user.click(within(region()).getByRole('button', { name: 'Try again' }))
    expect(await within(region()).findByText('No link has been sent yet.')).toBeInTheDocument()
  })
})

describe('RecordsExportLinksSection — sending a link', () => {
  it('says, before sending, where it goes, what it does, and which link stops working', async () => {
    const user = userEvent.setup()
    renderSection()
    await linkItems()
    const dialog = await openDialog(user)

    expect(within(dialog).getByText(
      "It goes to pat@example.com, the address on the account. It works once, for 72 hours, and asks for Pat's date of birth before the download — 5 wrong dates lock it.",
    )).toBeInTheDocument()
    expect(within(dialog).getByText(`The link sent on ${formatLinkMoment(OPEN.createdAt)} stops working.`)).toBeInTheDocument()
    // Nothing is sent by opening the dialog.
    expect(sent.filter((request) => request.method === 'POST')).toStrictEqual([])
  })

  it('says nothing about a link stopping when none is open', async () => {
    const user = userEvent.setup()
    list = () => json([link(2), link(1, { status: 'replaced', replacedAt: '2031-03-02T09:00:00.000Z' })])
    renderSection()
    await linkItems()
    const dialog = await openDialog(user)
    expect(within(dialog).queryByText(/stops working/)).not.toBeInTheDocument()
  })

  it('sends, closes the dialog, says where it went — and lists the links again', async () => {
    const user = userEvent.setup()
    renderSection()
    await linkItems()
    const dialog = await openDialog(user)

    list = () => json([NEW_LINK, { ...OPEN, status: 'replaced', replacedAt: NEW_LINK.createdAt }])
    await user.click(within(dialog).getByRole('button', { name: 'Send the link' }))

    expect(await within(region()).findByRole('status')).toHaveTextContent(
      `A download link was emailed to pat@example.com. It works until ${formatLinkMoment(NEW_LINK.expiresAt)}.`,
    )
    expect(within(region()).getByRole('status')).toHaveClass('bg-green-600/10')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await vi.waitFor(async () =>
      expect((await linkItems()).map((item) => item.firstChild?.textContent)).toStrictEqual([
        'Not used yet',
        'Replaced',
      ]),
    )
    expect(sent).toStrictEqual([
      { method: 'GET', path: LINKS_PATH },
      { method: 'POST', path: LINKS_PATH },
      { method: 'GET', path: LINKS_PATH },
    ])
  })

  it("says honestly when the email couldn't be sent", async () => {
    const user = userEvent.setup()
    post = () => json({ ...NEW_LINK, emailSentAt: null, emailSent: false }, 201)
    renderSection()
    await linkItems()
    await user.click(within(await openDialog(user)).getByRole('button', { name: 'Send the link' }))

    const status = await within(region()).findByRole('status')
    expect(status).toHaveTextContent(
      /^A link was created, but the email couldn't be sent\. Try sending another link\.$/,
    )
    expect(status).toHaveClass('bg-amber-500/10')
  })

  it('shows it is busy, and sends once however often it is pressed', async () => {
    const user = userEvent.setup()
    let finish: (response: Response) => void = () => {}
    post = () => new Promise<Response>((resolve) => (finish = resolve))
    renderSection()
    await linkItems()
    const dialog = await openDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Send the link' }))

    const busy = within(dialog).getByRole('button', { name: 'Sending…' })
    expect(busy).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.click(busy)
    expect(sent.filter((request) => request.method === 'POST')).toHaveLength(1)

    finish(json({ ...NEW_LINK, emailSent: true }, 201))
    // screen, not region(): the region is hidden until the dialog closes.
    expect(await screen.findByRole('status')).toHaveTextContent(/^A download link was emailed/)
  })

  // Two admins at the same moment: the backend refuses the second (409) —
  // exactly when the list on screen is out of date, so it's fetched again.
  it('shows a refusal in the dialog, and lists the links again', async () => {
    const user = userEvent.setup()
    post = () =>
      json(
        {
          statusCode: 409,
          message: ['Another link for this patient was sent at the same moment. Refresh to see it.'],
          error: 'Conflict',
        },
        409,
      )
    renderSection()
    await linkItems()
    const dialog = await openDialog(user)
    list = () => json([NEW_LINK, { ...OPEN, status: 'replaced', replacedAt: NEW_LINK.createdAt }])
    await user.click(within(dialog).getByRole('button', { name: 'Send the link' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Another link for this patient was sent at the same moment. Refresh to see it.',
    )
    // Behind the modal dialog: { hidden: true }, or "absent" would pass for
    // nothing (the dialog hides the page from role queries).
    const behind = screen.getByRole('region', { name: 'Health record copy', hidden: true })
    expect(within(behind).queryByRole('status', { hidden: true })).not.toBeInTheDocument()
    await vi.waitFor(() => expect(sent.filter((request) => request.method === 'GET')).toHaveLength(2))
    await vi.waitFor(() =>
      expect(
        within(within(behind).getByRole('list', { name: 'Links sent', hidden: true }))
          .getAllByRole('listitem', { hidden: true })
          .map((item) => item.firstChild?.textContent),
      ).toStrictEqual(['Not used yet', 'Replaced']),
    )
  })

  it('starts the dialog clean when it is opened again', async () => {
    const user = userEvent.setup()
    post = () => json({ statusCode: 500, message: ['Internal server error'], error: 'Error' }, 500)
    renderSection()
    await linkItems()
    let dialog = await openDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Send the link' }))
    await within(dialog).findByRole('alert')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    dialog = await openDialog(user)
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })
})