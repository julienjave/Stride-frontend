import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { json, urlOf } from '@/medical-files/testData'
import { apiError } from '@/sessions/testData'
import { saveFile } from '@/common/saveFile'
import { expectSkeleton } from '@/common/loadingAssertions'
import { formatLinkMoment } from '@/records-export/recordsExportRules'
import { ComplaintReviewsSection } from './ComplaintReviewsSection'
import type { ComplaintReviewSummary } from './types'

// The admin's "Complaint reviews" on a patient's user page (decisions §25,
// pass 2). The words are complaintReviewRules.test.ts's; here, what the
// section does: the list, opening one, a copy, ending one.

// The browser can't save files in a test: saveFile — tested on its own — is
// replaced, and what it was given is checked.
vi.mock('@/common/saveFile', () => ({ saveFile: vi.fn() }))
const saved = vi.mocked(saveFile)

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const ME = 1
const AVERY = { id: ME, firstName: 'Avery', lastName: 'Admin' }
const OLIVE = { id: 2, firstName: 'Olive', lastName: 'Other' }
const LIST_PATH = '/users/7/complaint-reviews'

function review(id: number, extra: Partial<ComplaintReviewSummary> = {}): ComplaintReviewSummary {
  return {
    id,
    status: 'open',
    reason: `Reason ${id}`,
    caseReference: null,
    openedBy: AVERY,
    openedAt: '2031-10-28T14:05:00.000Z',
    expiresAt: '2031-11-04T14:05:00.000Z',
    endedAt: null,
    endedBy: null,
    ...extra,
  }
}

function pdf(fileName: string | null) {
  return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
    status: 200,
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
let open: () => Response | Promise<Response>
let end: () => Response | Promise<Response>
let copy: () => Response | Promise<Response>

beforeEach(() => {
  sent = []
  saved.mockReset()
  list = () => json([review(12)])
  open = () => json(review(13), 201)
  end = () => json(review(12, { status: 'ended', endedAt: '2031-10-29T09:00:00.000Z', endedBy: AVERY }))
  copy = () => pdf('stride-review-copy-12-2031-10-28.pdf')
  fetchMock.mockReset()
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(urlOf(input))
    const request = { method: init?.method ?? 'GET', path: url.pathname + url.search, body: init?.body as string | undefined }
    sent.push(request)
    if (request.path === LIST_PATH) {
      return Promise.resolve(request.method === 'POST' ? open() : list())
    }
    if (request.path === `${LIST_PATH}/12/end`) return Promise.resolve(end())
    if (url.pathname === `${LIST_PATH}/12/copy`) return Promise.resolve(copy())
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })
  render(
    <QueryClientProvider client={queryClient}>
      <ComplaintReviewsSection patientId={7} firstName="Pat" lastName="Lee" myId={ME} />
    </QueryClientProvider>,
  )
}

const region = () => screen.getByRole('region', { name: 'Complaint reviews' })
const items = async () =>
  within(await screen.findByRole('list', { name: 'Complaint reviews' })).getAllByRole('listitem')
const gets = () => sent.filter((request) => request.method === 'GET' && request.path === LIST_PATH)

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(region()).getByRole('button', { name: 'Open a review' }))
  return screen.findByRole('dialog', { name: "Open a complaint review of Pat Lee's record?" })
}

describe('ComplaintReviewsSection — the list', () => {
  it('says what a review is, who is told, and lists them newest first', async () => {
    list = () =>
      json([
        review(13, { openedBy: OLIVE, caseReference: 'CR-14' }),
        review(12, { status: 'expired', reason: 'Line one\nLine two' }),
      ])
    renderSection()
    expect(
      within(region()).getByText(
        "When Pat makes a complaint, open a review to see what their record says: for 7 days you can download copies of it — their medical file, programs and sessions — each one stamped and recorded. Their care team is told; Pat isn't told in the app.",
      ),
    ).toBeInTheDocument()

    const [newest, older] = await items()
    expect(within(newest).getByText('Review 13')).toBeInTheDocument()
    expect(within(newest).getByText('Open')).toBeInTheDocument()
    expect(newest).toHaveTextContent('Reason: Reason 13')
    expect(newest).toHaveTextContent('Case reference: CR-14')
    // Another admin's: who can copy, no copy button — but it can be ended.
    expect(within(newest).getByText('Only Olive Other, who opened it, can download copies with it.')).toBeInTheDocument()
    expect(within(newest).queryByRole('button', { name: /^Download/ })).not.toBeInTheDocument()
    expect(within(newest).getByRole('button', { name: 'End now (review 13)' })).toBeInTheDocument()

    expect(within(older).getByText('Expired')).toBeInTheDocument()
    expect(older).toHaveTextContent(`Expired on ${formatLinkMoment('2031-11-04T14:05:00.000Z')}.`)
    // The reason as typed, its line break kept on screen.
    expect(within(older).getByText(/Line one/)).toHaveClass('whitespace-pre-wrap')
    // Over: no buttons at all.
    expect(within(older).queryByRole('button')).not.toBeInTheDocument()
  })

  it('says when there is none, and shows loading words first', async () => {
    let answer!: (response: Response) => void
    list = () => new Promise((resolve) => (answer = resolve))
    renderSection()
    expectSkeleton('Loading the complaint reviews…')
    answer(json([]))
    expect(await within(region()).findByText('No review has been opened.')).toBeInTheDocument()
  })
})

describe('ComplaintReviewsSection — opening a review', () => {
  it('says what opening does, asks for a reason first, then opens one', async () => {
    const user = userEvent.setup()
    renderSection()
    const dialog = await openDialog(user)
    expect(
      within(dialog).getByText(
        `For 7 days, you'll be able to download copies of Pat's record, each stamped "Review copy" and recorded with what it held. Pat's care team will see that you opened a review, and until when — not why. Pat isn't told in the app.`,
      ),
    ).toBeInTheDocument()

    // An empty field not tried yet is not a mistake: no error on opening.
    const reason = within(dialog).getByLabelText('Reason')
    expect(reason).toHaveAttribute('aria-invalid', 'false')
    expect(within(dialog).queryByText('Say why you are opening this review.')).not.toBeInTheDocument()

    // Nothing typed: refused here, focus on the field, nothing sent.
    await user.click(within(dialog).getByRole('button', { name: 'Open the review' }))
    expect(reason).toHaveFocus()
    expect(reason).toHaveAttribute('aria-invalid', 'true')
    expect(reason).toHaveAccessibleDescription(
      "Seen by the clinic's admins only, and printed on each copy. Say why you are opening this review.",
    )
    expect(sent.filter((request) => request.method === 'POST')).toEqual([])

    await user.type(reason, '  Knee worse  ')
    await user.type(within(dialog).getByLabelText('Case reference (optional)'), ' CR-14 ')
    list = () => json([review(13), review(12)])
    await user.click(within(dialog).getByRole('button', { name: 'Open the review' }))

    expect(sent.filter((request) => request.method === 'POST')).toEqual([
      { method: 'POST', path: LIST_PATH, body: JSON.stringify({ reason: 'Knee worse', caseReference: 'CR-14' }) },
    ])
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(region()).getByRole('status')).toHaveTextContent(
      `Review opened. You can download copies until ${formatLinkMoment('2031-11-04T14:05:00.000Z')}.`,
    )
    // The list asked again: the new review is in it.
    expect(await items()).toHaveLength(2)
    expect(gets()).toHaveLength(2)
  })

  it('says a refusal in the dialog, and reopens empty', async () => {
    open = () => apiError(400, "The reason can't be blank")
    const user = userEvent.setup()
    renderSection()
    let dialog = await openDialog(user)
    await user.type(within(dialog).getByLabelText('Reason'), 'Why')
    await user.click(within(dialog).getByRole('button', { name: 'Open the review' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent("The reason can't be blank")

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    dialog = await openDialog(user)
    expect(within(dialog).getByLabelText('Reason')).toHaveValue('')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('ComplaintReviewsSection — a copy', () => {
  it('downloads a copy in the device’s zone, saves it under the server’s name, and says so', async () => {
    const user = userEvent.setup()
    renderSection()
    const [item] = await items()
    await user.click(within(item).getByRole('button', { name: 'Download a review copy (review 12)' }))

    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(saved.mock.calls[0][1]).toBe('stride-review-copy-12-2031-10-28.pdf')
    expect(sent.at(-1)).toMatchObject({
      method: 'GET',
      path: `${LIST_PATH}/12/copy?timeZone=America%2FToronto`,
    })
    expect(await within(item).findByRole('status')).toHaveTextContent(
      'Downloaded as stride-review-copy-12-2031-10-28.pdf. Look in your downloads. This copy is recorded.',
    )
  })

  it('names the file after its review when the browser hides the server’s name', async () => {
    copy = () => pdf(null)
    const user = userEvent.setup()
    renderSection()
    const [item] = await items()
    await user.click(within(item).getByRole('button', { name: /^Download a review copy/ }))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(saved.mock.calls[0][1]).toBe('stride-review-copy-12.pdf')
  })

  it('says a refusal in the item, and asks for the list again (it may have ended)', async () => {
    copy = () =>
      apiError(410, 'This review has ended. Open a new one, with its reason, to make another copy.')
    const user = userEvent.setup()
    renderSection()
    const [item] = await items()
    await user.click(within(item).getByRole('button', { name: /^Download a review copy/ }))
    expect(await within(item).findByRole('alert')).toHaveTextContent(
      'This review has ended. Open a new one, with its reason, to make another copy.',
    )
    expect(saved).not.toHaveBeenCalled()
    await waitFor(() => expect(gets()).toHaveLength(2))
  })
})

describe('ComplaintReviewsSection — ending a review', () => {
  it('confirms first, then ends it: focus to the heading, said, the list again', async () => {
    const user = userEvent.setup()
    renderSection()
    const [item] = await items()
    await user.click(within(item).getByRole('button', { name: 'End now (review 12)' }))
    const dialog = await screen.findByRole('dialog', { name: 'End review 12 now?' })
    expect(
      within(dialog).getByText(
        'No more copies can be made with it. The copies already made stay recorded. To look at the record again, open a new review, with its reason.',
      ),
    ).toBeInTheDocument()
    expect(sent.filter((request) => request.method === 'POST')).toEqual([])

    list = () =>
      json([review(12, { status: 'ended', endedAt: '2031-10-29T09:00:00.000Z', endedBy: AVERY })])
    await user.click(within(dialog).getByRole('button', { name: 'End the review' }))

    expect(sent.filter((request) => request.method === 'POST').map((request) => request.path)).toEqual([
      `${LIST_PATH}/12/end`,
    ])
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: 'Complaint reviews' })).toHaveFocus(),
    )
    expect(within(region()).getAllByRole('status')[0]).toHaveTextContent(
      'Review 12 ended. No more copies can be made with it.',
    )
    expect(await within(region()).findByText('Ended early')).toBeInTheDocument()
  })

  it('says a refusal in the confirmation, and asks for the list again', async () => {
    end = () => apiError(409, 'This review has already ended.')
    const user = userEvent.setup()
    renderSection()
    const [item] = await items()
    await user.click(within(item).getByRole('button', { name: /^End now/ }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'End the review' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This review has already ended.')
    await waitFor(() => expect(gets()).toHaveLength(2))
  })
})
