import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { SessionPage } from './SessionPage'
import type { Session, SessionExerciseChanges } from './types'
import {
  A,
  KNEE,
  PAT,
  apiError,
  json,
  programExercise,
  session,
  sessionExercise,
  urlOf,
} from './testData'

// The running session, one exercise at a time (pass (b)) — through the real
// page, against a small SIMULATED SERVER: each PATCH applies its body to the
// server's copy and answers the whole session, as the backend does. Tests
// that need to hold or fail a request replace `patchAnswer`.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// Session 31 of today, open: Heel Slides (done), Squat (20 kg — Pat prefers
// pounds), Bridge (with a practitioner's note). Their program rows carry
// photos: Heel Slides two, Squat none, Bridge one (a RETIRED program row).
function openSession(): Session {
  return session({
    exercises: [
      sessionExercise(1, 0, {
        name: 'Heel Slides',
        sets: 3,
        reps: 10,
        completed: true,
        instructions: ['Lie on your back.', 'Slide the heel in.'],
        primaryMuscles: ['hamstrings'],
        equipment: ['body only'],
      }),
      sessionExercise(2, 1, {
        name: 'Squat',
        sets: 3,
        reps: 8,
        weight: 20,
        weightUnit: 'kg',
        instructions: ['Feet apart.', 'Sit back.', 'Stand up.'],
        primaryMuscles: ['quadriceps', 'glutes'],
        equipment: [],
      }),
      sessionExercise(9, 2, {
        name: 'Bridge',
        assignedProgramExerciseId: 3,
        notes: 'Stop if your back hurts.',
        instructions: ['Lift the hips.'],
        primaryMuscles: [],
      }),
    ],
  })
}

const PROGRAM = {
  ...KNEE,
  exercises: [
    programExercise(1, A, 0, { images: [{ url: 'https://s/heel-1.jpg' }, { url: 'https://s/heel-2.jpg' }] }),
    programExercise(2, A, 1),
  ],
  retiredExercises: [programExercise(3, A, 2, { images: [{ url: 'https://s/bridge.jpg' }] })],
}

let server: Session
let patchAnswer: (rowId: number, body: SessionExerciseChanges) => Promise<Response>
// Reads of the session AFTER the page's first one wait for this, when set —
// so a test can see the screen BEFORE a re-read answers (and answer it with
// what the server said at the time the read was sent).
let readGate: Promise<unknown> | null
let reads: number

function applyOnServer(rowId: number, body: SessionExerciseChanges) {
  server = {
    ...server,
    exercises: server.exercises.map((row) => (row.id === rowId ? { ...row, ...body } : row)),
  }
  return json(server)
}

beforeEach(() => {
  fetchMock.mockReset()
  server = openSession()
  patchAnswer = (rowId, body) => Promise.resolve(applyOnServer(rowId, body))
  readGate = null
  reads = 0
  fetchMock.mockImplementation((input, init) => {
    const url = urlOf(input)
    const patch = /\/sessions\/31\/exercises\/(\d+)$/.exec(url)
    if (init?.method === 'PATCH' && patch) {
      return patchAnswer(Number(patch[1]), JSON.parse(init.body as string) as SessionExerciseChanges)
    }
    if (/\/sessions\/31$/.test(url)) {
      reads += 1
      const snapshot = json(server)
      if (reads > 1 && readGate) return readGate.then(() => snapshot)
      return Promise.resolve(snapshot)
    }
    if (/\/assigned-programs\/12$/.test(url)) return Promise.resolve(json(PROGRAM))
    return Promise.reject(new Error(`unexpected request: ${url}`))
  })
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2031, 5, 12, 15, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, PAT)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/patient/sessions/31']}>
        <Routes>
          <Route path="/patient/sessions/:sessionId" element={<SessionPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

// Each PATCH as its path and LITERAL body.
function patches() {
  return fetchMock.mock.calls
    .filter(([, init]) => init?.method === 'PATCH')
    .map(([input, init]) => `${new URL(urlOf(input)).pathname} ${init?.body as string}`)
}

function sessionReads() {
  return fetchMock.mock.calls.filter(([input]) => /\/sessions\/31$/.test(urlOf(input))).length
}

// A response the test answers when it chooses.
function held() {
  let answer!: (response: Response) => void
  const promise = new Promise<Response>((resolve) => (answer = resolve))
  return { promise, answer }
}

function exerciseHeading() {
  return screen.getByRole('heading', { level: 2, name: /^(Heel Slides|Squat|Bridge)$/ })
}

async function opened() {
  return screen.findByText(/^Exercise \d of 3$/)
}

function doneButton(name: string) {
  return screen.getByRole('button', { name: `Done: ${name}` })
}

function allExercises() {
  const section = screen.getByRole('heading', { name: 'All exercises' }).closest('section') as HTMLElement
  return within(section).getAllByRole('button')
}

describe('SessionPlayer — one exercise at a time', () => {
  it('opens on the first exercise not done yet', async () => {
    renderPage()
    expect(await opened()).toHaveTextContent('Exercise 2 of 3')
    expect(exerciseHeading()).toHaveTextContent('Squat')
    expect(screen.getByText('1 of 3 exercises done')).toBeInTheDocument()
    // Today's open session is simply in progress — not "left open".
    expect(screen.queryByText(/was left open/)).not.toBeInTheDocument()
  })

  it("shows the session's copy: prescription (in the patient's unit), steps in order, what it works", async () => {
    renderPage()
    await opened()
    const article = screen.getByRole('article', { name: 'Squat' })
    // The prescribed part is its own <span> (WeightValue): read the line whole.
    expect(within(article).getByText(/^3 sets · 8 reps/)).toHaveTextContent('3 sets · 8 reps · 44.1 lbs (20 kg)')
    const steps = within(article).getByRole('list')
    expect(within(steps).getAllByRole('listitem').map((step) => step.textContent)).toStrictEqual([
      'Feet apart.',
      'Sit back.',
      'Stand up.',
    ])
    expect(within(article).getByText('Works: quadriceps, glutes')).toBeInTheDocument()
    // No photos for this one: no carousel, no "no photos" text.
    expect(within(article).queryByRole('img')).not.toBeInTheDocument()
    expect(within(article).queryByText(/No photos/)).not.toBeInTheDocument()
  })

  it("shows the program's photos for the exercise — a retired program row's too — and the practitioner's note", async () => {
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(allExercises()[0])
    expect(screen.getByRole('img', { name: /Heel Slides/ })).toHaveAttribute('src', 'https://s/heel-1.jpg')
    expect(screen.getByText('Works: hamstrings · Equipment: body only')).toBeInTheDocument()

    await user.click(allExercises()[2])
    expect(screen.getByRole('img', { name: /Bridge/ })).toHaveAttribute('src', 'https://s/bridge.jpg')
    expect(screen.getByText('Stop if your back hurts.')).toBeInTheDocument()
    expect(screen.getByText(/From your practitioner:/)).toBeInTheDocument()
    // Nothing it works or needs listed: no line at all.
    expect(screen.queryByText(/^Works:|^Equipment:/)).not.toBeInTheDocument()
  })

  it('moves with Previous and Next, and says when it is the last', async () => {
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Exercise 3 of 3')).toBeInTheDocument()
    expect(exerciseHeading()).toHaveTextContent('Bridge')
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.getByText("That's the last exercise.")).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(exerciseHeading()).toHaveTextContent('Heel Slides')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  })

  // Focus follows the exercise — but opening the page doesn't take it.
  it("moves focus to the new exercise's name after Next, not on opening", async () => {
    const user = userEvent.setup()
    renderPage()
    await opened()
    expect(exerciseHeading()).not.toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(exerciseHeading()).toHaveFocus()
    expect(exerciseHeading()).toHaveTextContent('Bridge')
  })

  it('lists every exercise with what is done, marks the one shown, and jumps to any', async () => {
    const user = userEvent.setup()
    renderPage()
    await opened()
    expect(allExercises().map((row) => row.textContent)).toStrictEqual([
      '1. Heel SlidesDone',
      '2. SquatTo do',
      '3. BridgeTo do',
    ])
    expect(allExercises()[1]).toHaveAttribute('aria-current', 'step')
    expect(allExercises()[0]).not.toHaveAttribute('aria-current')

    await user.click(allExercises()[2])
    expect(exerciseHeading()).toHaveTextContent('Bridge')
    expect(allExercises()[2]).toHaveAttribute('aria-current', 'step')
    expect(exerciseHeading()).toHaveFocus()
  })
})

describe('SessionPlayer — the endings', () => {
  it('leads to Finish and to Stop, from any exercise', async () => {
    renderPage()
    await opened()
    expect(screen.getByRole('link', { name: 'Finish session' })).toHaveAttribute(
      'href',
      '/patient/sessions/31/finish',
    )
    expect(screen.getByRole('link', { name: 'Stop session' })).toHaveAttribute(
      'href',
      '/patient/sessions/31/stop',
    )
  })
})

describe('SessionPlayer — Done, at once', () => {
  it('ticks at once, before the server answers — then keeps the answer', async () => {
    const request = held()
    patchAnswer = (rowId, body) => request.promise.then(() => applyOnServer(rowId, body))
    const user = userEvent.setup()
    renderPage()
    await opened()
    expect(doneButton('Squat')).toHaveAttribute('aria-pressed', 'false')

    await user.click(doneButton('Squat'))
    // Shown before any answer: the optimistic update.
    expect(doneButton('Squat')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('2 of 3 exercises done')).toBeInTheDocument()
    expect(allExercises()[1]).toHaveTextContent('2. SquatDone')
    expect(patches()).toStrictEqual(['/sessions/31/exercises/2 {"completed":true}'])

    request.answer(json(server))
    await vi.waitFor(() => expect(doneButton('Squat')).toHaveAttribute('aria-pressed', 'true'))
  })

  // The answer is the TRUTH and replaces the guess: here the server also
  // knows Heel Slides was unticked (from another tab, say), which the screen
  // couldn't guess.
  it("writes the server's answer once it arrives — what the screen couldn't guess included", async () => {
    patchAnswer = (rowId, body) => {
      server.exercises[0] = { ...server.exercises[0], completed: false }
      return Promise.resolve(applyOnServer(rowId, body))
    }
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(doneButton('Squat'))
    await vi.waitFor(() => expect(allExercises()[0]).toHaveTextContent('1. Heel SlidesTo do'))
    expect(allExercises()[1]).toHaveTextContent('2. SquatDone')
  })

  it('unticks, sending false', async () => {
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(allExercises()[0])
    await user.click(doneButton('Heel Slides'))
    expect(doneButton('Heel Slides')).toHaveAttribute('aria-pressed', 'false')
    expect(patches()).toStrictEqual(['/sessions/31/exercises/1 {"completed":false}'])
  })

  it('undoes the tick and says so when saving fails — by itself, before any re-read answers', async () => {
    patchAnswer = () => Promise.resolve(apiError(500, 'Internal server error'))
    readGate = new Promise(() => {})
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(doneButton('Squat'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save “Done” for Squat. Something went wrong on our side. Try again in a moment.",
    )
    expect(doneButton('Squat')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('1 of 3 exercises done')).toBeInTheDocument()
  })

  // A 409: the session was finished elsewhere. The backend's reason is
  // shown, and the session is read again — the page turns read-only.
  it("passes on the backend's refusal and reads the session again", async () => {
    patchAnswer = () => {
      server = { ...server, status: 'completed', completedAt: '2031-06-12T12:40:00.000Z' }
      return Promise.resolve(apiError(409, 'This session is finished, so it can no longer change'))
    }
    const user = userEvent.setup()
    renderPage()
    await opened()
    const readsBefore = sessionReads()
    await user.click(doneButton('Squat'))
    await vi.waitFor(() => expect(sessionReads()).toBe(readsBefore + 1))
    // Read-only now: no player, the plain list.
    await vi.waitFor(() =>
      expect(screen.queryByRole('button', { name: /^Done:/ })).not.toBeInTheDocument(),
    )
    expect(screen.getByText(/^Completed · /)).toBeInTheDocument()
  })

  it('clears the message with the next change', async () => {
    let fail = true
    patchAnswer = (rowId, body) =>
      Promise.resolve(fail ? apiError(500, 'boom') : applyOnServer(rowId, body))
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(doneButton('Squat'))
    await screen.findByRole('alert')
    fail = false
    await user.click(doneButton('Squat'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('SessionPlayer — one request at a time', () => {
  it('sends the second change only once the first is answered — both shown at once', async () => {
    const first = held()
    const answers = [first.promise]
    patchAnswer = (rowId, body) => {
      const wait = answers.shift() ?? Promise.resolve()
      return Promise.resolve(wait).then(() => applyOnServer(rowId, body))
    }
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(doneButton('Squat'))
    await user.click(screen.getByRole('radio', { name: '7' }))
    // Both on screen…
    expect(doneButton('Squat')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('radio', { name: '7' })).toBeChecked()
    // …one request sent.
    expect(patches()).toStrictEqual(['/sessions/31/exercises/2 {"completed":true}'])

    first.answer(json(server))
    await vi.waitFor(() =>
      expect(patches()).toStrictEqual([
        '/sessions/31/exercises/2 {"completed":true}',
        '/sessions/31/exercises/2 {"difficultyRating":7}',
      ]),
    )
    await vi.waitFor(() => expect(server.exercises[1]).toMatchObject({ completed: true, difficultyRating: 7 }))
    expect(screen.getByRole('radio', { name: '7' })).toBeChecked()
  })

  // The first answer knows nothing of the second change (the rating):
  // written into the cache while the rating is still queued, it would take
  // the rating off the screen until the second answer. Only the last
  // answer writes.
  it("doesn't let an older answer wipe a newer change still on its way", async () => {
    const first = held()
    const second = held()
    const answers = [first.promise, second.promise]
    patchAnswer = (rowId, body) => {
      const wait = answers.shift()!
      // The server's answer as of THIS request (the next one not applied).
      return wait.then(() => applyOnServer(rowId, body))
    }
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(doneButton('Squat'))
    await user.click(screen.getByRole('radio', { name: '7' }))

    first.answer(json(null))
    // The second request goes out once the first is answered…
    await vi.waitFor(() => expect(patches()).toHaveLength(2))
    // …and the rating, not in the first answer, is still shown.
    expect(screen.getByRole('radio', { name: '7' })).toBeChecked()

    second.answer(json(null))
    await vi.waitFor(() => expect(server.exercises[1].difficultyRating).toBe(7))
    expect(screen.getByRole('radio', { name: '7' })).toBeChecked()
    expect(doneButton('Squat')).toHaveAttribute('aria-pressed', 'true')
  })

  // A failure undoes ONLY its own change: the rating queued behind it stays.
  it('undoes only the failed change, not one queued behind it', async () => {
    const first = held()
    const second = held()
    let calls = 0
    patchAnswer = (rowId, body) => {
      calls += 1
      if (calls === 1) return first.promise.then(() => apiError(500, 'boom'))
      return second.promise.then(() => applyOnServer(rowId, body))
    }
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.click(doneButton('Squat'))
    await user.click(screen.getByRole('radio', { name: '7' }))
    first.answer(json(null))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save “Done” for Squat. Something went wrong on our side. Try again in a moment.",
    )
    // While the rating's request is still unanswered: the tick undone, the
    // rating kept.
    expect(doneButton('Squat')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('radio', { name: '7' })).toBeChecked()
    // No re-read meanwhile: it would bring back a row without the rating.
    expect(reads).toBe(1)

    second.answer(json(null))
    await vi.waitFor(() => expect(server.exercises[1].difficultyRating).toBe(7))
    expect(screen.getByRole('radio', { name: '7' })).toBeChecked()
  })

  // A re-read of the session already on its way when a tick is made: its
  // answer is older than the tick. The tick cancels it, so it can't land
  // over the tick.
  it('cancels a re-read on its way, so its older answer never covers a tick', async () => {
    let fail = true
    patchAnswer = (rowId, body) =>
      Promise.resolve(fail ? apiError(500, 'boom') : applyOnServer(rowId, body))
    let releaseRead!: () => void
    readGate = new Promise<void>((resolve) => (releaseRead = resolve))
    const user = userEvent.setup()
    renderPage()
    await opened()
    // A failed tick starts a re-read (held, answering "Squat not done").
    await user.click(doneButton('Squat'))
    await screen.findByRole('alert')
    await vi.waitFor(() => expect(reads).toBe(2))
    // Tick again, then let the old re-read answer.
    fail = false
    readGate = null
    await user.click(doneButton('Squat'))
    releaseRead()
    await vi.waitFor(() => expect(server.exercises[1].completed).toBe(true))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(doneButton('Squat')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('SessionPlayer — how it felt', () => {
  it('saves a difficulty from 1 to 10 at once, and clears it', async () => {
    const user = userEvent.setup()
    renderPage()
    await opened()
    const scale = screen.getByRole('group', { name: 'How hard was it?' })
    expect(within(scale).getAllByRole('radio')).toHaveLength(10)
    await user.click(within(scale).getByRole('radio', { name: '7' }))
    await user.click(screen.getByRole('button', { name: 'Clear answer: How hard was it?' }))
    expect(patches()).toStrictEqual([
      '/sessions/31/exercises/2 {"difficultyRating":7}',
      '/sessions/31/exercises/2 {"difficultyRating":null}',
    ])
  })

  it('saves a note trimmed, only when there is something new to save', async () => {
    const user = userEvent.setup()
    renderPage()
    await opened()
    const save = screen.getByRole('button', { name: 'Save note' })
    expect(save).toBeDisabled()
    const field = screen.getByLabelText('Anything to tell your practitioner? (optional)')
    await user.type(field, '   ')
    // Spaces only: nothing to save.
    expect(save).toBeDisabled()
    await user.type(field, 'felt easy  ')
    await user.click(save)
    expect(patches()).toStrictEqual(['/sessions/31/exercises/2 {"feedback":"felt easy"}'])
    // Saved (shown at once): the button rests again.
    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled()
  })

  it('removes a saved note when the field is emptied — sending null', async () => {
    server = openSession()
    server.exercises[1] = { ...server.exercises[1], feedback: 'knee clicked' }
    const user = userEvent.setup()
    renderPage()
    await opened()
    const field = screen.getByLabelText('Anything to tell your practitioner? (optional)')
    expect(field).toHaveValue('knee clicked')
    await user.clear(field)
    await user.click(screen.getByRole('button', { name: 'Remove note' }))
    expect(patches()).toStrictEqual(['/sessions/31/exercises/2 {"feedback":null}'])
  })

  it("keeps each exercise's note draft apart", async () => {
    const user = userEvent.setup()
    renderPage()
    await opened()
    await user.type(screen.getByLabelText('Anything to tell your practitioner? (optional)'), 'draft for Squat')
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByLabelText('Anything to tell your practitioner? (optional)')).toHaveValue('')
  })

  it('caps a note at the backend’s 2,000 characters', async () => {
    renderPage()
    await opened()
    expect(screen.getByLabelText('Anything to tell your practitioner? (optional)')).toHaveAttribute(
      'maxLength',
      '2000',
    )
  })
})

describe('SessionPlayer — only while the session can be done', () => {
  it('shows a finished session as a plain list — nothing to tick', async () => {
    server = { ...openSession(), status: 'completed', completedAt: '2031-06-12T12:40:00.000Z' }
    renderPage()
    expect(await screen.findByText('1 of 3 exercises done')).toBeInTheDocument()
    expect(screen.queryByText(/^Exercise \d of 3$/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Done:/ })).not.toBeInTheDocument()
  })

  it('shows a session left open on an earlier day as a plain list', async () => {
    server = { ...openSession(), localDate: '2031-06-11', startedAt: '2031-06-11T12:05:00.000Z' }
    renderPage()
    expect(await screen.findByText(/was left open/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Done:/ })).not.toBeInTheDocument()
  })
})