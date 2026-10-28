import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderMedicalFile, requests, type SentRequest } from '@/medical-files/renderMedicalFile'
import { chainedFile, json } from '@/medical-files/testData'
import { saveFile } from '@/common/saveFile'

// "Download my records" on My records (decisions §20, pass 3), rendered on
// the real page through the medical files' harness. jsdom can't download,
// so saveFile — tested on its own — is replaced, and what it was given is
// checked.
vi.mock('@/common/saveFile', () => ({ saveFile: vi.fn() }))
const saved = vi.mocked(saveFile)

const PATH = '/profile/records'
// A zone with slashes and an underscore, set as the device's (below): the
// request must carry it escaped.
const ZONE = 'America/Argentina/Buenos_Aires'
const EXPORT_PATH = '/records-export?timeZone=America%2FArgentina%2FBuenos_Aires'
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46])

function pdf(fileName: string | null = 'stride-health-record-2031-03-10.pdf') {
  return new Response(PDF, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      ...(fileName ? { 'Content-Disposition': `attachment; filename="${fileName}"` } : {}),
    },
  })
}

function refusal(statusCode: number, message: string, headers: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({ statusCode, message: [message], error: 'Error', timestamp: '', path: '/records-export' }),
    { status: statusCode, headers: { 'Content-Type': 'application/json', ...headers } },
  )
}

// The file's own request answered with `file`; the download with `download`.
function answers(download: () => Response | Promise<Response>, file: () => Response = () => json(chainedFile())) {
  return ({ method, path }: SentRequest) =>
    method === 'GET' && path === '/medical-files'
      ? file()
      : method === 'GET' && path === EXPORT_PATH
        ? download()
        : undefined
}

const downloads = () => requests().filter((request) => request.path.startsWith('/records-export'))

beforeEach(() => {
  saved.mockClear()
  // The device's zone, as browserTimeZone reads it: a real answer, taken
  // before the spy, with the zone replaced.
  const real = new Intl.DateTimeFormat().resolvedOptions()
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...real, timeZone: ZONE })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function section() {
  return screen.findByRole('region', { name: 'Download a copy' })
}

describe('DownloadMyRecords', () => {
  it("downloads the patient's copy in the device's zone, and saves it under the server's name", async () => {
    const user = userEvent.setup()
    renderMedicalFile([PATH], answers(() => pdf()), 'patient')
    const region = await section()
    expect(
      within(region).getByText(/^Your whole record as a PDF — these notes, your programs and your sessions/),
    ).toBeInTheDocument()

    // Opening the page asks for nothing but the notes: a copy is made only
    // when asked for (each one is audited).
    await screen.findByRole('list', { name: 'Entries' })
    expect(downloads()).toStrictEqual([])

    await user.click(within(region).getByRole('button', { name: 'Download my records' }))

    expect(await within(region).findByRole('status')).toHaveTextContent(
      'Downloaded as stride-health-record-2031-03-10.pdf. Look in your downloads.',
    )
    expect(downloads()).toStrictEqual([{ method: 'GET', path: EXPORT_PATH, body: null }])
    expect(saved).toHaveBeenCalledTimes(1)
    const [blob, name] = saved.mock.calls[0]
    expect(name).toBe('stride-health-record-2031-03-10.pdf')
    expect(new Uint8Array(await blob.arrayBuffer())).toStrictEqual(PDF)
  })

  // The browser hid the header (an older backend that doesn't expose it).
  it("saves under the app's own name when the server's can't be read", async () => {
    const user = userEvent.setup()
    renderMedicalFile([PATH], answers(() => pdf(null)), 'patient')
    await user.click(within(await section()).getByRole('button', { name: 'Download my records' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Downloaded as stride-health-record.pdf. Look in your downloads.',
    )
    expect(saved.mock.calls[0][1]).toBe('stride-health-record.pdf')
  })

  it('shows it is busy, and sends one request however often it is pressed', async () => {
    const user = userEvent.setup()
    let finish: (response: Response) => void = () => {}
    renderMedicalFile(
      [PATH],
      answers(() => new Promise<Response>((resolve) => (finish = resolve))),
      'patient',
    )
    const region = await section()
    await user.click(within(region).getByRole('button', { name: 'Download my records' }))

    const busy = within(region).getByRole('button', { name: 'Preparing your copy…' })
    expect(busy).toBeDisabled()
    await user.click(busy)
    expect(downloads()).toHaveLength(1)
    expect(saved).not.toHaveBeenCalled()

    finish(pdf())
    expect(await within(region).findByRole('button', { name: 'Download my records' })).toBeEnabled()
    expect(saved).toHaveBeenCalledTimes(1)
  })

  it('says a 429 in plain words, with the wait — and saves nothing', async () => {
    const user = userEvent.setup()
    let answer = () => refusal(429, 'ThrottlerException: Too Many Requests', { 'Retry-After': '37' })
    renderMedicalFile([PATH], answers(() => answer()), 'patient')
    const region = await section()
    await user.click(within(region).getByRole('button', { name: 'Download my records' }))

    expect(await within(region).findByRole('alert')).toHaveTextContent(
      /^Too many downloads in a short time\. Try again in 37 seconds\.$/,
    )
    expect(saved).not.toHaveBeenCalled()
    expect(within(region).queryByRole('status')).not.toBeInTheDocument()

    // Pressing again is allowed — and a success clears the message.
    answer = () => pdf()
    await user.click(within(region).getByRole('button', { name: 'Download my records' }))
    expect(await within(region).findByRole('status')).toBeInTheDocument()
    expect(within(region).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('blames the connection when there is no answer', async () => {
    const user = userEvent.setup()
    renderMedicalFile([PATH], answers(() => Promise.reject(new TypeError('Failed to fetch'))), 'patient')
    const region = await section()
    await user.click(within(region).getByRole('button', { name: 'Download my records' }))
    expect(await within(region).findByRole('alert')).toHaveTextContent(
      'Something went wrong. Check your connection and try again.',
    )
  })

  // The copy holds more than the notes and comes from its own request: it
  // doesn't wait for, or depend on, the notes' list.
  it('is offered whether the notes failed to load, or there are none', async () => {
    const user = userEvent.setup()
    renderMedicalFile([PATH], answers(() => pdf(), () => refusal(500, 'Boom')), 'patient')
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't load your records\./)
    await user.click(within(await section()).getByRole('button', { name: 'Download my records' }))
    expect(await screen.findByRole('status')).toHaveTextContent(/^Downloaded as /)
  })

  it('is offered on an empty file too', async () => {
    renderMedicalFile([PATH], answers(() => pdf(), () => json([])), 'patient')
    await screen.findByText("Your practitioners haven't written anything in your file yet.")
    expect(within(await section()).getByRole('button', { name: 'Download my records' })).toBeEnabled()
  })
})