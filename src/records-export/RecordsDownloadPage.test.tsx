import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { saveFile } from '@/common/saveFile'
import { urlOf } from '@/medical-files/testData'
import { RecordsDownloadPage } from './RecordsDownloadPage'

// The page the records email links to (decisions §20, pass 3). jsdom can't
// download, so saveFile — tested on its own — is replaced.
vi.mock('@/common/saveFile', () => ({ saveFile: vi.fn() }))
const saved = vi.mocked(saveFile)

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

const ZONE = 'Europe/Paris'
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46])

function pdf(fileName: string | null = 'stride-health-record-2031-03-10.pdf') {
  return new Response(PDF, {
    status: 200,
    headers: fileName ? { 'Content-Disposition': `attachment; filename="${fileName}"` } : {},
  })
}

function refusal(statusCode: number, message: string, extra: object = {}, headers: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({ statusCode, message: [message], error: 'Error', timestamp: '', path: '/x', ...extra }),
    { status: statusCode, headers: { 'Content-Type': 'application/json', ...headers } },
  )
}

const WRONG_DATE = "This date of birth doesn't match the one on file."

// Each request as { method, path, body } — bodies compared as literal text.
function sent() {
  return fetchMock.mock.calls.map(([input, init]) => ({
    method: init?.method ?? 'GET',
    path: new URL(urlOf(input)).pathname,
    body: init?.body,
  }))
}

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderPage(entry = '/records-download?token=abc123') {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[entry]}>
        <Address />
        <Routes>
          <Route path="/records-download" element={<RecordsDownloadPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function submitDate(user: ReturnType<typeof userEvent.setup>, date: string) {
  const field = screen.getByLabelText('Date of birth')
  await user.clear(field)
  if (date) await user.type(field, date)
  await user.click(screen.getByRole('button', { name: 'Download my records' }))
}

beforeEach(() => {
  fetchMock.mockReset()
  saved.mockClear()
  // The device's zone, as browserTimeZone reads it: a real answer, taken
  // before the spy, with the zone replaced.
  const real = new Intl.DateTimeFormat().resolvedOptions()
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...real, timeZone: ZONE })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RecordsDownloadPage — opening the link', () => {
  // Mail scanners open every link in an email before the person does: a
  // request on load would spend the link (or count a wrong date) for them.
  it('sends NOTHING when it opens — and takes the token out of the address', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Download your health record' })).toBeInTheDocument()
    expect(screen.getByLabelText('Date of birth')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Date of birth')).toHaveAttribute('autocomplete', 'bday')
    expect(screen.getByTestId('address')).toHaveTextContent(/^\/records-download$/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('asks for the link from the email when there is no token', () => {
    renderPage('/records-download')
    expect(screen.getByRole('heading', { level: 1, name: 'Open your download link' })).toBeInTheDocument()
    expect(screen.getByText(/needs the link from the email your clinic sent/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument()
  })
})

describe('RecordsDownloadPage — downloading', () => {
  it('sends the token, the date and the zone in the body — then saves the copy and says the link is spent', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(pdf())
    renderPage()
    await submitDate(user, '1990-04-12')

    expect(await screen.findByRole('heading', { level: 1, name: 'Your record was downloaded' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Saved as stride-health-record-2031-03-10.pdf. Look in your downloads.',
    )
    expect(screen.getByText(/This link has now been used\. If you need another copy, ask your clinic/)).toBeInTheDocument()
    // The form is gone: the link is spent.
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument()

    expect(sent()).toStrictEqual([
      {
        method: 'POST',
        path: '/records-export/download',
        body: '{"token":"abc123","dateOfBirth":"1990-04-12","timeZone":"Europe/Paris"}',
      },
    ])
    expect(saved).toHaveBeenCalledTimes(1)
    const [blob, name] = saved.mock.calls[0]
    expect(name).toBe('stride-health-record-2031-03-10.pdf')
    expect(new Uint8Array(await blob.arrayBuffer())).toStrictEqual(PDF)
  })

  it("saves under the app's own name when the server's can't be read", async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(pdf(null))
    renderPage()
    await submitDate(user, '1990-04-12')
    expect(await screen.findByRole('status')).toHaveTextContent('Saved as stride-health-record.pdf.')
    expect(saved.mock.calls[0][1]).toBe('stride-health-record.pdf')
  })

  it('asks for a date before sending anything', async () => {
    const user = userEvent.setup()
    renderPage()
    await submitDate(user, '')

    const field = screen.getByLabelText('Date of birth')
    expect(screen.getByText('Enter your date of birth')).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('Enter your date of birth')
    expect(fetchMock).not.toHaveBeenCalled()

    // Chosen: the message goes, the request leaves.
    fetchMock.mockResolvedValue(pdf())
    await submitDate(user, '1990-04-12')
    await screen.findByRole('heading', { level: 1, name: 'Your record was downloaded' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shows it is busy, and sends one request however often it is pressed', async () => {
    const user = userEvent.setup()
    let finish: (response: Response) => void = () => {}
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (finish = resolve)))
    renderPage()
    await submitDate(user, '1990-04-12')

    const busy = screen.getByRole('button', { name: 'Preparing your copy…' })
    expect(busy).toBeDisabled()
    await user.click(busy)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    finish(pdf())
    await screen.findByRole('heading', { level: 1, name: 'Your record was downloaded' })
  })
})

describe('RecordsDownloadPage — a wrong date of birth', () => {
  it('says so with the tries left, and keeps the form and the date to correct', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(refusal(400, WRONG_DATE, { attemptsLeft: 4 }))
    renderPage()
    await submitDate(user, '1990-04-21')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^This date of birth doesn't match the one on file\. 4 tries left\.$/,
    )
    expect(screen.getByLabelText('Date of birth')).toHaveValue('1990-04-21')
    expect(screen.getByRole('button', { name: 'Download my records' })).toBeEnabled()
    expect(saved).not.toHaveBeenCalled()
  })

  it('warns before the last try', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(refusal(400, WRONG_DATE, { attemptsLeft: 1 }))
    renderPage()
    await submitDate(user, '1990-04-21')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This date of birth doesn't match the one on file. 1 try left. After one more wrong date, this link stops working.",
    )
  })

  it('says no count when the answer has none', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(refusal(400, WRONG_DATE))
    renderPage()
    await submitDate(user, '1990-04-21')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^This date of birth doesn't match the one on file\.$/,
    )
  })

  // (The fifth wrong date is the 410 `locked` — the next block.)
  it('a right date after a wrong one downloads', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValueOnce(refusal(400, WRONG_DATE, { attemptsLeft: 4 }))
    renderPage()
    await submitDate(user, '1990-04-21')
    await screen.findByRole('alert')

    fetchMock.mockResolvedValueOnce(pdf())
    await submitDate(user, '1990-04-12')
    expect(await screen.findByRole('heading', { level: 1, name: 'Your record was downloaded' })).toBeInTheDocument()
    expect(sent().map((request) => request.body)).toStrictEqual([
      '{"token":"abc123","dateOfBirth":"1990-04-21","timeZone":"Europe/Paris"}',
      '{"token":"abc123","dateOfBirth":"1990-04-12","timeZone":"Europe/Paris"}',
    ])
  })
})

describe('RecordsDownloadPage — a link that can no longer be used', () => {
  // The server's message says why and what next; `reason` adds a warning
  // where someone else may have the link. The form goes: trying again can't
  // change the answer.
  it.each([
    ['used', "If you didn't download it yourself, tell your clinic: someone else may have opened the link."],
    ['replaced', null],
    ['locked', "If you didn't type those dates, tell your clinic: someone else may have tried the link."],
    ['expired', null],
    // A reason the page doesn't know: nothing made up.
    ['stolen', null],
  ])('%s: the server’s words, and its warning if any', async (reason, warning) => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(refusal(410, `Next step for ${reason}.`, { reason }))
    renderPage()
    await submitDate(user, '1990-04-12')

    expect(await screen.findByRole('heading', { level: 1, name: "This link can't be used" })).toBeInTheDocument()
    expect(screen.getByText(`Next step for ${reason}.`)).toBeInTheDocument()
    if (warning) expect(screen.getByText(warning)).toBeInTheDocument()
    else expect(screen.queryByText(/tell your clinic/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument()
    expect(saved).not.toHaveBeenCalled()
  })

  it('a link that is not valid: what to check, and whom to ask', async () => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(refusal(404, 'This download link is not valid'))
    renderPage()
    await submitDate(user, '1990-04-12')
    expect(await screen.findByRole('heading', { level: 1, name: "This link isn't valid" })).toBeInTheDocument()
    expect(
      screen.getByText(
        "This download link is not valid. Check that you opened the whole link from the email — some mail programs cut long links. If it still doesn't work, ask your clinic for a new one.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Date of birth')).not.toBeInTheDocument()
  })
})

describe('RecordsDownloadPage — other failures', () => {
  // Not a verdict on the link: the form stays, to try again.
  it.each([
    [
      '429',
      () => refusal(429, 'ThrottlerException: Too Many Requests', {}, { 'Retry-After': '12' }),
      'Too many downloads in a short time. Try again in 12 seconds.',
    ],
    ['500', () => refusal(500, 'Internal server error'), "Your copy couldn't be made just now. Try again in a moment."],
    // Another 400 (the DTO): its own words — and no count of tries.
    ['400', () => refusal(400, 'dateOfBirth must be a valid date', { attemptsLeft: 3 }), 'dateOfBirth must be a valid date'],
  ])('a %s: in plain words, with the form kept', async (_status, answer, words) => {
    const user = userEvent.setup()
    fetchMock.mockResolvedValue(answer())
    renderPage()
    await submitDate(user, '1990-04-12')
    expect(await screen.findByRole('alert')).toHaveTextContent(new RegExp(`^${words.replace(/[.?]/g, '\\$&')}$`))
    expect(screen.getByRole('button', { name: 'Download my records' })).toBeEnabled()
    expect(screen.getByRole('heading', { level: 1, name: 'Download your health record' })).toBeInTheDocument()
  })

  it('no answer at all: the connection', async () => {
    const user = userEvent.setup()
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    renderPage()
    await submitDate(user, '1990-04-12')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Check your connection and try again.',
    )
  })
})