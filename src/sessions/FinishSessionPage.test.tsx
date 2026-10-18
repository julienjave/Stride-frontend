import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { readNotice } from '@/common/readNotice'
import { assignedProgramSummaryQueryKey } from '@/assigned-programs/api'
import { programSessionsQueryKey } from '@/progress/api'
import { sessionQueryKey } from './api'
import { FinishSessionPage } from './FinishSessionPage'
import type { Session } from './types'
import { KNEE, PAT, TODAY, apiError, json, session, sessionExercise, summary, urlOf } from './testData'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

let sessionAnswer: () => Response
let completeAnswer: () => Promise<Response>

// Heel Slides ticked, Squat not.
function open(fields: Partial<Session> = {}) {
  return session({
    exercises: [
      sessionExercise(1, 0, { name: 'Heel Slides', completed: true }),
      sessionExercise(2, 1, { name: 'Squat' }),
    ],
    ...fields,
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  sessionAnswer = () => json(open())
  completeAnswer = () =>
    Promise.resolve(json(open({ status: 'completed', completedAt: '2031-06-12T13:00:00.000Z' })))
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (init?.method === 'POST' && /\/sessions\/31\/complete$/.test(url)) return completeAnswer()
    if (/\/sessions\/31$/.test(url)) return Promise.resolve(sessionAnswer())
    if (/\/assigned-programs\/12$/.test(url)) return Promise.resolve(json(KNEE))
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 15, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

// The pages around this one: the home shows the notice it was handed; the
// session page offers the browser's Back.
function HomeStandIn() {
  const navigate = useNavigate()
  return (
    <>
      <p>Home page. Notice: {readNotice(useLocation().state) ?? 'none'}</p>
      <button onClick={() => void navigate(-1)}>Back from home</button>
    </>
  )
}
function SessionStandIn() {
  const navigate = useNavigate()
  return (
    <>
      <p>Session page</p>
      <button onClick={() => void navigate(-1)}>Browser back</button>
    </>
  )
}

function renderPage(path = '/patient/sessions/31/finish') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  render(
    <QueryClientProvider client={queryClient}>
      {/* The session page first, then this one — as when Finish was tapped. */}
      <MemoryRouter initialEntries={['/patient/sessions/31', path]} initialIndex={1}>
        <Routes>
          <Route path="/patient" element={<HomeStandIn />} />
          <Route path="/patient/sessions/:sessionId" element={<SessionStandIn />} />
          <Route path="/patient/sessions/:sessionId/finish" element={<FinishSessionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

function posts() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'POST')
    .map(([input, init]) => `${new URL(urlOf(input)).pathname} ${init?.body as string}`)
}

async function form() {
  return screen.findByRole('heading', { name: 'Finish your session' })
}

describe('FinishSessionPage — the review', () => {
  it('shows the session, how much is ticked, and suggests Stop for what is not', async () => {
    renderPage()
    await form()
    expect(await screen.findByText('Knee Rehab: A · Mobility')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 exercises done')).toBeInTheDocument()
    expect(
      screen.getByText(/^1 exercise isn't ticked\. If you didn't do it, you can stop the session instead/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Stop instead' })).toHaveAttribute(
      'href',
      '/patient/sessions/31/stop',
    )
    expect(
      screen.getByText('Once finished, the session is recorded as it is and can no longer be changed.'),
    ).toBeInTheDocument()
  })

  it('suggests nothing when every exercise is ticked', async () => {
    sessionAnswer = () =>
      json(open({ exercises: [sessionExercise(1, 0, { name: 'Heel Slides', completed: true })] }))
    renderPage()
    await form()
    expect(screen.queryByText(/isn't ticked/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Stop instead' })).not.toBeInTheDocument()
  })

  it('asks the check-out — pain and mobility, apart, optional — and a word for the practitioner', async () => {
    renderPage()
    await form()
    const pain = screen.getByRole('group', { name: 'How much pain do you have now?' })
    const mobility = screen.getByRole('group', { name: 'How freely can you move now?' })
    expect(pain).toHaveAccessibleDescription('Optional. 0 = no pain, 10 = worst pain imaginable.')
    expect(mobility).toHaveAccessibleDescription('Optional. 0 = not at all, 10 = completely freely.')
    expect(within(mobility).getAllByRole('radio')).toHaveLength(11)
    expect(
      screen.getByLabelText('Anything to tell your practitioner about this session? (optional)'),
    ).toHaveAttribute('maxLength', '2000')
  })
})

describe('FinishSessionPage — finishing', () => {
  it('sends nothing not answered', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(screen.getByRole('button', { name: 'Finish session' }))
    await screen.findByText(/^Home page/)
    expect(posts()).toStrictEqual(['/sessions/31/complete {}'])
  })

  it('sends the answers — 0 included — and the feedback trimmed', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    const pain = screen.getByRole('group', { name: 'How much pain do you have now?' })
    const mobility = screen.getByRole('group', { name: 'How freely can you move now?' })
    await user.click(within(pain).getByRole('radio', { name: '0' }))
    await user.click(within(mobility).getByRole('radio', { name: '8' }))
    await user.type(
      screen.getByLabelText('Anything to tell your practitioner about this session? (optional)'),
      '  Felt good.  ',
    )
    await user.click(screen.getByRole('button', { name: 'Finish session' }))
    await screen.findByText(/^Home page/)
    expect(posts()).toStrictEqual([
      '/sessions/31/complete {"painAfter":0,"mobilityAfter":8,"sessionFeedback":"Felt good."}',
    ])
  })

  it('goes home in place of this page, with a confirmation, the answer cached and the summaries stale', async () => {
    const user = userEvent.setup()
    const queryClient = renderPage()
    await form()
    queryClient.setQueryData(assignedProgramSummaryQueryKey(12, TODAY, '2031-06-25'), summary())
    queryClient.setQueryData(programSessionsQueryKey(12), [])
    await user.click(screen.getByRole('button', { name: 'Finish session' }))
    expect(await screen.findByText('Home page. Notice: Session finished. Well done!')).toBeInTheDocument()
    expect(queryClient.getQueryData<Session>(sessionQueryKey(31))?.status).toBe('completed')
    expect(
      queryClient.getQueryState(assignedProgramSummaryQueryKey(12, TODAY, '2031-06-25'))?.isInvalidated,
    ).toBe(true)
    // The progress charts' list too: the check-out brought new scores.
    expect(queryClient.getQueryState(programSessionsQueryKey(12))?.isInvalidated).toBe(true)
    // Back: the session page — not this form for a session now final.
    await user.click(screen.getByRole('button', { name: 'Back from home' }))
    expect(await screen.findByText('Session page')).toBeInTheDocument()
  })

  it('takes no second tap while finishing', async () => {
    let answer!: (response: Response) => void
    completeAnswer = () => new Promise((resolve) => (answer = resolve))
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(screen.getByRole('button', { name: 'Finish session' }))
    expect(await screen.findByRole('button', { name: 'Finishing…' })).toBeDisabled()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    expect(
      screen.getByLabelText('Anything to tell your practitioner about this session? (optional)'),
    ).toBeDisabled()
    answer(json(open({ status: 'completed', completedAt: '2031-06-12T13:00:00.000Z' })))
    await screen.findByText(/^Home page/)
    expect(posts()).toHaveLength(1)
  })

  it("shows the backend's reason when it refuses, and stays", async () => {
    completeAnswer = () =>
      Promise.resolve(
        apiError(409, 'This session started on another day, so it can no longer be completed: stop it instead'),
      )
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(screen.getByRole('button', { name: 'Finish session' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't finish the session. This session started on another day, so it can no longer be completed: stop it instead",
    )
    expect(screen.getByRole('button', { name: 'Finish session' })).toBeEnabled()
  })
})

describe('FinishSessionPage — nothing to finish', () => {
  it('says a finished session is finished — no form', async () => {
    sessionAnswer = () => json(open({ status: 'completed', completedAt: '2031-06-12T13:00:00.000Z' }))
    renderPage()
    expect(await screen.findByText('This session is already finished.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See the session' })).toHaveAttribute('href', '/patient/sessions/31')
    expect(screen.queryByRole('button', { name: 'Finish session' })).not.toBeInTheDocument()
  })

  // Completing happens on a session's own day: an earlier day's open
  // session can only be stopped.
  it('offers Stop, not Finish, for a session from an earlier day', async () => {
    sessionAnswer = () => json(open({ localDate: '2031-06-11', startedAt: '2031-06-11T12:00:00.000Z' }))
    renderPage()
    expect(await screen.findByText(/started on another day, so it can no longer be finished/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Stop the session' })).toHaveAttribute(
      'href',
      '/patient/sessions/31/stop',
    )
    expect(screen.queryByRole('button', { name: 'Finish session' })).not.toBeInTheDocument()
  })

  it("says a session it can't see isn't available", async () => {
    sessionAnswer = () => apiError(404, 'Session not found')
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent("This session doesn't exist, or isn't yours.")
  })

  it('refuses an address that names no session, asking nothing', async () => {
    renderPage('/patient/sessions/abc/finish')
    expect(await screen.findByRole('alert')).toHaveTextContent("This session doesn't exist, or isn't yours.")
    expect(fetchMock).not.toHaveBeenCalled()
  })
})