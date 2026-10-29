import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { json, urlOf } from '@/medical-files/testData'
import { apiError } from '@/sessions/testData'
import { saveFile } from '@/common/saveFile'
import { expectSkeleton } from '@/common/loadingAssertions'
import { formatLinkMoment } from '@/records-export/recordsExportRules'
import { LegalDisclosuresSection } from './LegalDisclosuresSection'
import { FORM_MESSAGES } from './legalDisclosureRules'
import type { LegalDisclosureSummary } from './types'

// The admin's "Legal disclosures" on a patient's user page (decisions §25,
// pass 3). The words are legalDisclosureRules.test.ts's; here, what the
// section does: the list, and recording one — which IS the download.

// The browser can't save files in a test: saveFile — tested on its own — is
// replaced, and what it was given is checked.
vi.mock('@/common/saveFile', () => ({ saveFile: vi.fn() }))
const saved = vi.mocked(saveFile)

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const ME = 1
const AVERY = { id: ME, firstName: 'Avery', lastName: 'Admin' }
const LIST_PATH = '/users/7/legal-disclosures'
// Days far from the real clock's today, on the right side of it: the form
// checks "received" against today, and the hold's end after it.
const PAST = '2020-01-15'
const FUTURE = '2099-12-31'

function disclosure(id: number, extra: Partial<LegalDisclosureSummary> = {}): LegalDisclosureSummary {
  return {
    id,
    madeAt: '2031-10-28T14:05:00.000Z',
    recipientName: 'Jane Roe',
    recipientOrganisation: 'Montreal Police',
    legalBasis: 'court_order',
    basisExplanation: null,
    parts: ['medical_file', 'messages'],
    periodFrom: '2031-03-01',
    periodTo: '2031-03-31',
    madeBy: AVERY,
    orderReference: '500-17-123',
    receivedOn: '2031-10-27',
    withheldUntil: null,
    shownToPatient: true,
    withholdingStatement: null,
    ...extra,
  }
}

function pdf(fileName: string | null) {
  return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
    status: 201,
    headers: {
      'Content-Type': 'application/pdf',
      ...(fileName ? { 'Content-Disposition': `attachment; filename="${fileName}"` } : {}),
    },
  })
}

interface Sent {
  method: string
  path: string
  body?: string
}
let sent: Sent[]
let list: () => Response | Promise<Response>
let make: () => Response | Promise<Response>

beforeEach(() => {
  sent = []
  saved.mockReset()
  list = () => json([disclosure(21)])
  make = () => pdf('stride-disclosure-22-2031-10-28.pdf')
  fetchMock.mockReset()
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(urlOf(input))
    const request = {
      method: init?.method ?? 'GET',
      path: url.pathname + url.search,
      body: init?.body as string | undefined,
    }
    sent.push(request)
    if (request.path === LIST_PATH) {
      return Promise.resolve(request.method === 'POST' ? make() : list())
    }
    return Promise.reject(new Error(`unexpected ${request.method} ${request.path}`))
  })
  // The device's zone, as browserTimeZone reads it.
  const real = new Intl.DateTimeFormat().resolvedOptions()
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...real,
    timeZone: 'America/Toronto',
  })
})

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <LegalDisclosuresSection patientId={7} firstName="Pat" lastName="Lee" myId={ME} />
    </QueryClientProvider>,
  )
}

const region = () => screen.getByRole('region', { name: 'Legal disclosures' })
const items = async () =>
  within(await screen.findByRole('list', { name: 'Legal disclosures' })).getAllByRole('listitem')
const gets = () => sent.filter((request) => request.method === 'GET' && request.path === LIST_PATH)
const posts = () => sent.filter((request) => request.method === 'POST')

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(region()).getByRole('button', { name: 'Record a disclosure' }))
  return screen.findByRole('dialog', { name: "Record a legal disclosure of Pat Lee's record" })
}

// The required fields, filled.
async function fillRequired(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText("Recipient's name"), ' Jane Roe ')
  await user.selectOptions(within(dialog).getByLabelText('Legal basis'), 'court_order')
  await user.type(within(dialog).getByLabelText('Request received on'), PAST)
  await user.click(within(dialog).getByRole('checkbox', { name: 'Messages' }))
}

describe('LegalDisclosuresSection — the list', () => {
  it('says what a disclosure is and who is told, and lists each with its order', async () => {
    list = () =>
      json([
        disclosure(22, {
          recipientOrganisation: null,
          legalBasis: 'other',
          basisExplanation: 'A tribunal order',
          orderReference: null,
          withheldUntil: '2099-12-31T05:00:00.000Z',
          shownToPatient: false,
          withholdingStatement: 'Line one\nLine two',
        }),
        disclosure(21),
      ])
    renderSection()
    expect(
      within(region()).getByText(
        "When the law requires the clinic to give Pat's record to someone outside it — a court order, a subpoena, a coroner — record it here. You get one copy of the parts the order covers, stamped on every page. Pat sees it on My records, unless an agency asks you to hold it back for a time; their care team is told who received it.",
      ),
    ).toBeInTheDocument()

    const [held, plain] = await items()
    expect(within(held).getByText('Disclosure 22')).toBeInTheDocument()
    expect(within(held).getByText('Held back')).toBeInTheDocument()
    expect(held).toHaveTextContent('Disclosed to: Jane Roe')
    expect(held).toHaveTextContent('Legal basis: Another legal basis: A tribunal order')
    expect(held).not.toHaveTextContent('Order reference')
    expect(held).toHaveTextContent("They don't see it yet.")
    // The agency's statement as written, its line break kept on screen.
    expect(within(held).getByText(/Line one/)).toHaveClass('whitespace-pre-wrap')

    expect(within(plain).queryByText('Held back')).not.toBeInTheDocument()
    expect(plain).toHaveTextContent('Disclosed to: Jane Roe (Montreal Police)')
    expect(plain).toHaveTextContent('Order reference: 500-17-123')
    expect(plain).toHaveTextContent(
      'Parts: Medical file and messages · March 1, 2031 to March 31, 2031',
    )
    expect(plain).toHaveTextContent(`Made by you on ${formatLinkMoment('2031-10-28T14:05:00.000Z')}.`)
    expect(plain).not.toHaveTextContent('Held back from')
  })

  it('says when there is none, and shows loading words first', async () => {
    let answer!: (response: Response) => void
    list = () => new Promise((resolve) => (answer = resolve))
    renderSection()
    expectSkeleton('Loading the legal disclosures…')
    answer(json([]))
    expect(await within(region()).findByText('No disclosure has been made.')).toBeInTheDocument()
  })
})

describe('LegalDisclosuresSection — recording a disclosure', () => {
  it('says what recording does, and asks for every required field first', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openDialog(user)
    expect(
      within(dialog).getByText(
        'Only when the law requires it. Recording it downloads ONE copy of the parts and the period you choose, stamped on every page — there is no second copy. Pat will see who received it, why, when and what, on My records. Their care team will see that you made it, and who received it.',
      ),
    ).toBeInTheDocument()

    // Not tried yet: no error.
    const recipient = within(dialog).getByLabelText("Recipient's name")
    expect(recipient).toHaveAttribute('aria-invalid', 'false')
    expect(within(dialog).queryByText(FORM_MESSAGES.recipientName)).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Record and download' }))
    // Refused here: focus on the first field, each error said, nothing sent.
    expect(recipient).toHaveFocus()
    expect(recipient).toHaveAccessibleDescription(FORM_MESSAGES.recipientName)
    expect(within(dialog).getByLabelText('Legal basis')).toHaveAccessibleDescription(
      FORM_MESSAGES.legalBasis,
    )
    expect(within(dialog).getByLabelText('Request received on')).toHaveAccessibleDescription(
      FORM_MESSAGES.receivedOnMissing,
    )
    expect(within(dialog).getByRole('group', { name: 'Parts of the record' })).toHaveAccessibleDescription(
      `Only what the order covers. Messages leave the app only this way. ${FORM_MESSAGES.parts}`,
    )
    expect(posts()).toEqual([])
  })

  it('moves focus to the first field still wrong', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openDialog(user)
    await user.type(within(dialog).getByLabelText("Recipient's name"), 'Jane Roe')
    await user.selectOptions(within(dialog).getByLabelText('Legal basis'), 'coroner')
    await user.type(within(dialog).getByLabelText('Request received on'), PAST)
    await user.click(within(dialog).getByRole('button', { name: 'Record and download' }))
    // Only the parts are missing: focus on the first box.
    expect(within(dialog).getByRole('checkbox', { name: 'Medical file' })).toHaveFocus()
    expect(posts()).toEqual([])
  })

  it('asks for an explanation only with "other", and the hold’s fields only when holding', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openDialog(user)
    expect(within(dialog).queryByLabelText('Explain the legal basis')).not.toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText('Legal basis'), 'other')
    expect(within(dialog).getByLabelText('Explain the legal basis')).toBeInTheDocument()

    expect(within(dialog).queryByLabelText('Pat sees it from')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('checkbox', { name: /^Hold it back from Pat/ }))
    expect(within(dialog).getByLabelText('Pat sees it from')).toBeInTheDocument()
    expect(within(dialog).getByLabelText("The agency's statement")).toBeInTheDocument()
  })

  it('records it: the order as typed, the copy saved under the server’s name, said, the list again', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openDialog(user)
    await fillRequired(user, dialog)
    await user.type(within(dialog).getByLabelText('Organisation (optional)'), 'Montreal Police')
    await user.type(within(dialog).getByLabelText('Order reference (optional)'), ' 500-17-123 ')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Medical file' }))
    await user.type(within(dialog).getByLabelText('From'), '2031-03-01')
    await user.click(within(dialog).getByRole('checkbox', { name: /^Hold it back from Pat/ }))
    await user.type(within(dialog).getByLabelText('Pat sees it from'), FUTURE)
    await user.type(within(dialog).getByLabelText("The agency's statement"), 'Investigation')
    list = () => json([disclosure(22), disclosure(21)])
    await user.click(within(dialog).getByRole('button', { name: 'Record and download' }))

    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(saved.mock.calls[0][1]).toBe('stride-disclosure-22-2031-10-28.pdf')
    expect(posts()).toEqual([
      {
        method: 'POST',
        path: LIST_PATH,
        body: JSON.stringify({
          recipientName: 'Jane Roe',
          recipientOrganisation: 'Montreal Police',
          legalBasis: 'court_order',
          orderReference: '500-17-123',
          receivedOn: PAST,
          parts: ['medical_file', 'messages'],
          periodFrom: '2031-03-01',
          withheldUntil: FUTURE,
          withholdingStatement: 'Investigation',
          timeZone: 'America/Toronto',
        }),
      },
    ])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(region()).getByRole('status')).toHaveTextContent(
      'Disclosure recorded. Its copy was downloaded as stride-disclosure-22-2031-10-28.pdf — look in your downloads.',
    )
    expect(await items()).toHaveLength(2)
    expect(gets()).toHaveLength(2)
  })

  it('names the file plainly when the browser hides the server’s name', async () => {
    make = () => pdf(null)
    const user = userEvent.setup()
    renderSection()
    const dialog = await openDialog(user)
    await fillRequired(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Record and download' }))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(saved.mock.calls[0][1]).toBe('stride-disclosure.pdf')
  })

  it('says a refusal in the dialog, keeps the form, and reopens empty after Cancel', async () => {
    make = () => apiError(400, 'The request can’t have been received after today')
    const user = userEvent.setup()
    renderSection()
    let dialog = await openDialog(user)
    await fillRequired(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'Record and download' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The request can’t have been received after today',
    )
    expect(saved).not.toHaveBeenCalled()
    expect(within(dialog).getByLabelText("Recipient's name")).toHaveValue(' Jane Roe ')

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    dialog = await openDialog(user)
    expect(within(dialog).getByLabelText("Recipient's name")).toHaveValue('')
    expect(within(dialog).getByRole('checkbox', { name: 'Messages' })).not.toBeChecked()
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })
})
