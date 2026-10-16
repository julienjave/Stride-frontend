import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { readNotice } from '@/common/readNotice'
import { StopSessionPage } from './StopSessionPage'
import type { Session } from './types'
import { PAT, apiError, json, session, urlOf } from './testData'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

let sessionAnswer: () => Response
let stopAnswer: () => Promise<Response>

function stopped(fields: Partial<Session> = {}) {
  return session({ status: 'incomplete', endReason: 'no_time', endedAt: '2031-06-12T13:00:00.000Z', ...fields })
}

beforeEach(() => {
  fetchMock.mockReset()
  sessionAnswer = () => json(session())
  stopAnswer = () => Promise.resolve(json(stopped()))
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (init?.method === 'POST' && /\/sessions\/31\/stop$/.test(url)) return stopAnswer()
    if (/\/sessions\/31$/.test(url)) return Promise.resolve(sessionAnswer())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 15, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function HomeStandIn() {
  return <p>Home page. Notice: {readNotice(useLocation().state) ?? 'none'}</p>
}

function renderPage(path = '/patient/sessions/31/stop') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/patient" element={<HomeStandIn />} />
          <Route path="/patient/sessions/:sessionId/stop" element={<StopSessionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function posts() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([input, init]) => `${new URL(urlOf(input)).pathname} ${init?.body as string}`)
}

function reasons() {
  return screen.getByRole('group', { name: 'Why are you stopping?' })
}

async function form() {
  return screen.findByRole('heading', { name: 'Stop your session' })
}

describe('StopSessionPage', () => {
  it('says what stopping means, and asks why — the patient’s four reasons, none chosen', async () => {
    renderPage()
    await form()
    expect(screen.getByText('The session will be kept as not finished, with what you did so far.')).toBeInTheDocument()
    expect(screen.getByText('0 of 2 exercises done')).toBeInTheDocument()
    const choices = within(reasons()).getAllByRole('radio')
    expect(choices.map((radio) => radio.closest('label')?.textContent)).toStrictEqual([
      'Pain',
      'Feeling unwell',
      'No time',
      'Another reason',
    ])
    expect(choices.some((radio) => (radio as HTMLInputElement).checked)).toBe(false)
    expect(screen.getByLabelText('Anything to add? (optional)')).toHaveAttribute('maxLength', '500')
  })

  // Required, but never pre-chosen: a reason the patient didn't give must
  // not be recorded as theirs.
  it('asks for a reason before stopping — and takes the patient to it', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(screen.getByRole('button', { name: 'Stop session' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a reason first.')
    expect(reasons()).toHaveAttribute('aria-invalid', 'true')
    expect(reasons()).toHaveAccessibleDescription('Choose a reason first.')
    expect(within(reasons()).getByRole('radio', { name: 'Pain' })).toHaveFocus()
    expect(posts()).toStrictEqual([])

    await user.click(within(reasons()).getByRole('radio', { name: 'No time' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(reasons()).toHaveAttribute('aria-invalid', 'false')
  })

  it('sends the reason alone when nothing else is answered', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(within(reasons()).getByRole('radio', { name: 'No time' }))
    await user.click(screen.getByRole('button', { name: 'Stop session' }))
    expect(await screen.findByText('Home page. Notice: Session stopped. It is kept as not finished.')).toBeInTheDocument()
    expect(posts()).toStrictEqual(['/sessions/31/stop {"reason":"no_time"}'])
  })

  it('sends the note trimmed and the check-out, 0 included', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(within(reasons()).getByRole('radio', { name: 'Pain' }))
    await user.type(screen.getByLabelText('Anything to add? (optional)'), '  knee hurt  ')
    const pain = screen.getByRole('group', { name: 'How much pain do you have now?' })
    const mobility = screen.getByRole('group', { name: 'How freely can you move now?' })
    await user.click(within(pain).getByRole('radio', { name: '7' }))
    await user.click(within(mobility).getByRole('radio', { name: '0' }))
    await user.click(screen.getByRole('button', { name: 'Stop session' }))
    await screen.findByText(/^Home page/)
    expect(posts()).toStrictEqual([
      '/sessions/31/stop {"reason":"pain","note":"knee hurt","painAfter":7,"mobilityAfter":0}',
    ])
  })

  // Finish can't reach an earlier day's session; Stop can.
  it('stops a session left open on an earlier day', async () => {
    sessionAnswer = () => json(session({ localDate: '2031-06-11', startedAt: '2031-06-11T12:00:00.000Z' }))
    renderPage()
    expect(await form()).toBeInTheDocument()
  })

  it('takes no second tap while stopping', async () => {
    let answer!: (response: Response) => void
    stopAnswer = () => new Promise((resolve) => (answer = resolve))
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(within(reasons()).getByRole('radio', { name: 'Another reason' }))
    await user.click(screen.getByRole('button', { name: 'Stop session' }))
    expect(await screen.findByRole('button', { name: 'Stopping…' })).toBeDisabled()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    expect(screen.getByLabelText('Anything to add? (optional)')).toBeDisabled()
    answer(json(stopped()))
    await screen.findByText(/^Home page/)
    expect(posts()).toHaveLength(1)
  })

  it("shows the backend's reason when it refuses, and stays", async () => {
    stopAnswer = () => Promise.resolve(apiError(409, 'This session is finished, so it can no longer change'))
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(within(reasons()).getByRole('radio', { name: 'Pain' }))
    await user.click(screen.getByRole('button', { name: 'Stop session' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't stop the session. This session is finished, so it can no longer change",
    )
  })

  it('says a finished session is finished — no form', async () => {
    sessionAnswer = () => json(stopped())
    renderPage()
    expect(await screen.findByText('This session is already finished.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stop session' })).not.toBeInTheDocument()
  })

  it("says a session it can't see isn't available", async () => {
    sessionAnswer = () => apiError(404, 'Session not found')
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent("This session doesn't exist, or isn't yours.")
  })

  it('refuses an address that names no session, asking nothing', async () => {
    renderPage('/patient/sessions/0/stop')
    expect(await screen.findByRole('alert')).toHaveTextContent("This session doesn't exist, or isn't yours.")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})