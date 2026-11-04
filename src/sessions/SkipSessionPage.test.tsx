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

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { assignedProgramQueryKey, assignedProgramSummaryQueryKey } from '@/assigned-programs/api'
import type { ScheduleSummary } from '@/assigned-programs/types'
import { SkipSessionPage } from './SkipSessionPage'
import { A, B, KNEE, PAT, TODAY, apiError, json, scheduledDay, session, summary, urlOf } from './testData'
import { expectLoadError, expectNotAvailable } from './notAvailableAssertions'
import { expectSnackbar, raisedSnackbars } from '@/snackbars/snackbarAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

let todaySummary: () => Response
let programAnswer: () => Response
let skipAnswer: () => Promise<Response>

// Today is a scheduled day, B · Strength, due.
const DUE = summary({ days: [scheduledDay(TODAY, B, 'due')] })

beforeEach(() => {
  fetchMock.mockReset()
  todaySummary = () => json(DUE)
  programAnswer = () => json(KNEE)
  skipAnswer = () =>
    Promise.resolve(
      json(
        session({
          id: 40,
          status: 'skipped',
          startedAt: null,
          endedAt: '2031-06-12T07:00:00.000Z',
          endReason: 'illness',
          exercises: [],
        }),
        201,
      ),
    )
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    if (init?.method === 'POST' && /\/sessions\/skip$/.test(url)) return skipAnswer()
    if (/\/assigned-programs\/12$/.test(url)) return Promise.resolve(programAnswer())
    if (/\/assigned-programs\/12\/summary\?today=/.test(url)) return Promise.resolve(todaySummary())
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 8, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function HomeStandIn() {
  const navigate = useNavigate()
  return (
    <>
      <p>Home page</p>
      <button onClick={() => void navigate(-1)}>Back from home</button>
    </>
  )
}

function renderPage(path = '/patient/sessions/skip/12', cachedSummary?: ScheduleSummary) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  if (cachedSummary) {
    queryClient.setQueryData(assignedProgramQueryKey(12), KNEE)
    queryClient.setQueryData(assignedProgramSummaryQueryKey(12, TODAY), cachedSummary)
  }
  render(
    <QueryClientProvider client={queryClient}>
      {/* The home first, then this page — as when "Skip today" was tapped. */}
      <MemoryRouter initialEntries={['/patient', path]} initialIndex={1}>
        <Routes>
          <Route path="/patient" element={<HomeStandIn />} />
          <Route path="/patient/sessions/skip/:programId" element={<SkipSessionPage />} />
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

function reasons() {
  return screen.getByRole('group', { name: 'Why are you skipping today?' })
}

async function form() {
  return screen.findByRole('heading', { name: "Skip today's session" })
}

describe('SkipSessionPage — the form', () => {
  it("names today's scheduled workout, says the practitioner will see it, asks why", async () => {
    renderPage()
    await form()
    expect(screen.getByText('Knee Rehab: B · Strength')).toBeInTheDocument()
    expect(screen.getByText('Your practitioner will see that you skipped it, and why.')).toBeInTheDocument()
    expect(within(reasons()).getAllByRole('radio')).toHaveLength(4)
  })

  // A pain level only when pain is the reason.
  it('asks the pain level only when the reason is pain', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    expect(screen.queryByRole('group', { name: 'How much pain do you have right now?' })).not.toBeInTheDocument()
    await user.click(within(reasons()).getByRole('radio', { name: 'Pain' }))
    expect(screen.getByRole('group', { name: 'How much pain do you have right now?' })).toBeInTheDocument()
    await user.click(within(reasons()).getByRole('radio', { name: 'No time' }))
    expect(screen.queryByRole('group', { name: 'How much pain do you have right now?' })).not.toBeInTheDocument()
  })

  it('asks for a reason before skipping — and takes the patient to it', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(screen.getByRole('button', { name: 'Skip today' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a reason first.')
    expect(within(reasons()).getByRole('radio', { name: 'Pain' })).toHaveFocus()
    expect(posts()).toStrictEqual([])
  })
})

describe('SkipSessionPage — skipping', () => {
  it('sends the program, today and the reason; goes home in place of this page with a confirmation', async () => {
    const user = userEvent.setup()
    const queryClient = renderPage()
    await form()
    queryClient.setQueryData(assignedProgramSummaryQueryKey(12, TODAY, '2031-06-25'), DUE)
    await user.click(within(reasons()).getByRole('radio', { name: 'Feeling unwell' }))
    await user.type(screen.getByLabelText('Anything to add? (optional)'), ' flu ')
    await user.click(screen.getByRole('button', { name: 'Skip today' }))
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expectSnackbar('success', "Today's session is skipped.")
    expect(posts()).toStrictEqual([
      '/sessions/skip {"assignedProgramId":12,"localDate":"2031-06-12","reason":"illness","note":"flu"}',
    ])
    // The home will say "Skipped today".
    expect(
      queryClient.getQueryState(assignedProgramSummaryQueryKey(12, TODAY, '2031-06-25'))?.isInvalidated,
    ).toBe(true)
    // This page was REPLACED: Back reaches the home the patient came from —
    // not this form again for a day now skipped — and the confirmation
    // isn't raised a second time (it was never in the history).
    await user.click(screen.getByRole('button', { name: 'Back from home' }))
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(raisedSnackbars()).toEqual([{ kind: 'success', text: "Today's session is skipped." }])
  })

  it('sends the pain level with the reason "pain" — 0 included', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(within(reasons()).getByRole('radio', { name: 'Pain' }))
    await user.click(screen.getByRole('radio', { name: '0' }))
    await user.click(screen.getByRole('button', { name: 'Skip today' }))
    await screen.findByText(/^Home page/)
    expect(posts()).toStrictEqual([
      '/sessions/skip {"assignedProgramId":12,"localDate":"2031-06-12","reason":"pain","painBefore":0}',
    ])
  })

  it('never sends a pain level chosen before the reason changed', async () => {
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(within(reasons()).getByRole('radio', { name: 'Pain' }))
    await user.click(screen.getByRole('radio', { name: '7' }))
    await user.click(within(reasons()).getByRole('radio', { name: 'No time' }))
    await user.click(screen.getByRole('button', { name: 'Skip today' }))
    await screen.findByText(/^Home page/)
    expect(posts()).toStrictEqual([
      '/sessions/skip {"assignedProgramId":12,"localDate":"2031-06-12","reason":"no_time"}',
    ])
  })

  it('takes no second tap while skipping', async () => {
    let answer!: (response: Response) => void
    skipAnswer = () => new Promise((resolve) => (answer = resolve))
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(within(reasons()).getByRole('radio', { name: 'No time' }))
    await user.click(screen.getByRole('button', { name: 'Skip today' }))
    expect(await screen.findByRole('button', { name: 'Skipping…' })).toBeDisabled()
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    expect(screen.getByLabelText('Anything to add? (optional)')).toBeDisabled()
    answer(json(session({ id: 40, status: 'skipped', startedAt: null, endReason: 'no_time', exercises: [] }), 201))
    await screen.findByText(/^Home page/)
    expect(posts()).toHaveLength(1)
  })

  it("shows the backend's reason when it refuses, and stays", async () => {
    skipAnswer = () =>
      Promise.resolve(apiError(409, 'Today already has a session for this program, so it can no longer be skipped'))
    const user = userEvent.setup()
    renderPage()
    await form()
    await user.click(within(reasons()).getByRole('radio', { name: 'No time' }))
    await user.click(screen.getByRole('button', { name: 'Skip today' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't skip today's session. Today already has a session for this program, so it can no longer be skipped",
    )
    expect(screen.getByRole('button', { name: 'Skip today' })).toBeEnabled()
  })
})

// The Start page's live-check finding, here too: the page DECIDES from the
// summary, so it asks again on every visit. The cache says "due"; the
// server says a session was started meanwhile — nothing to skip.
describe('SkipSessionPage — decides from a fresh answer', () => {
  it('shows Loading — not a form from the cached answer — while it asks', async () => {
    let answer!: (response: Response) => void
    fetchMock.mockImplementation((input) => {
      const url = urlOf(input)
      if (/\/summary\?today=/.test(url)) return new Promise((resolve) => (answer = resolve))
      return Promise.reject(new Error(`unexpected request: ${url}`))
    })
    renderPage('/patient/sessions/skip/12', DUE)
    expect(await screen.findByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip today' })).not.toBeInTheDocument()
    answer(json({ ...DUE, openSession: { sessionId: 31, localDate: TODAY, workoutId: B } }))
    expect(await screen.findByText('There is no scheduled session to skip today.')).toBeInTheDocument()
  })

  it("doesn't offer a skip on an outdated cached answer", async () => {
    todaySummary = () => json({ ...DUE, openSession: { sessionId: 31, localDate: TODAY, workoutId: B } })
    renderPage('/patient/sessions/skip/12', DUE)
    expect(await screen.findByText('There is no scheduled session to skip today.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip today' })).not.toBeInTheDocument()
  })
})

describe('SkipSessionPage — nothing to skip', () => {
  // Only a DUE scheduled day can be skipped (the backend's rule): a
  // catch-up day, a session already open or done, a weekly program — no.
  it.each([
    [
      'a catch-up day',
      summary({
        days: [scheduledDay('2031-06-11', A, 'due')],
        nextWorkout: { workoutId: A, forDay: '2031-06-11', programWeek: null, until: '2031-06-12' },
      }),
    ],
    ['a day already done', summary({ days: [scheduledDay(TODAY, B, 'done')] })],
    ['a session open', { ...DUE, openSession: { sessionId: 31, localDate: TODAY, workoutId: B } }],
  ])('says so on %s — no form, nothing sent', async (_label, answer) => {
    todaySummary = () => json(answer)
    renderPage()
    expect(await screen.findByText('There is no scheduled session to skip today.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Knee Rehab' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip today' })).not.toBeInTheDocument()
  })

  it("says a program it can't see isn't available — asking nothing more", async () => {
    programAnswer = () => apiError(404, 'Assigned program not found')
    renderPage()
    await expectNotAvailable('program')
    expect(fetchMock.mock.calls.map(([input]) => new URL(urlOf(input)).pathname)).toStrictEqual([
      '/assigned-programs/12',
    ])
  })

  it('says so when loading fails for another reason, with "Try again"', async () => {
    programAnswer = () => apiError(500, 'Internal server error')
    renderPage()
    await expectLoadError('program')
  })

  it('a "Try again" that works shows the form, with focus on its heading', async () => {
    const user = userEvent.setup()
    programAnswer = () => apiError(500, 'Internal server error')
    renderPage()
    await expectLoadError('program')
    programAnswer = () => json(KNEE)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    const heading = await screen.findByRole('heading', { level: 1, name: "Skip today's session" })
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('refuses an address that names no program, asking nothing', async () => {
    renderPage('/patient/sessions/skip/x')
    await expectNotAvailable('program')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})