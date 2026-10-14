import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { assignedProgramQueryKey } from './api'
import { ProgramExercisesSection } from './ProgramExercisesSection'
import { useAssignedProgram } from './useAssignedProgram'
import { useProgramWorkoutEditing } from './useProgramWorkoutEditing'
import type {
  AssignedProgramDetail,
  AssignedProgramExercise,
  ScheduleVersion,
} from './types'

// The program page's exercise editor (step 3b-1): the shared list
// (WorkoutListEditor — its drags and shapes are the template page's, tested
// there) with what is a PROGRAM's: its routes, the removal dialog that asks
// the backend first, the delete rule, and "Show N removed exercises".

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function apiError(statusCode: number, message: string) {
  return json({ statusCode, message: [message], error: 'Error' }, statusCode)
}

const TODAY = '2031-06-12'

function exercise(
  id: number,
  workoutId: number,
  name: string,
  fields: Partial<AssignedProgramExercise> = {},
): AssignedProgramExercise {
  return {
    id,
    assignedProgramId: 12,
    workoutId,
    exerciseId: id + 100,
    name,
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    instructions: [],
    sets: 3,
    reps: 10,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    sortOrder: 0,
    notes: null,
    retiredAt: null,
    retiredBy: null,
    images: [],
    ...fields,
  }
}

function version(fields: Partial<ScheduleVersion>): ScheduleVersion {
  return {
    id: 1,
    assignedProgramId: 12,
    type: 'weekdays',
    timesPerWeek: null,
    effectiveFrom: '2031-06-02',
    createdBy: 3,
    createdAt: '2031-06-02T09:00:00Z',
    days: [],
    rotation: [],
    ...fields,
  }
}

const HEEL = exercise(101, 57, 'Heel Slides')
const BRIDGE = exercise(102, 58, 'Glute Bridge', {
  reps: 8,
  weight: 20,
  weightUnit: 'kg',
  notes: 'Keep the pelvis level.',
})
const CLAM = exercise(103, 58, 'Clamshell', { sortOrder: 1 })

// Workouts A (Mobility: Heel Slides — Mondays), B (Strength: Glute Bridge,
// Clamshell — Wednesdays) and C (empty, unscheduled).
const PROGRAM: AssignedProgramDetail = {
  id: 12,
  patientId: 6,
  assignedBy: 3,
  basedOnTemplateId: 1,
  basedOnProgramId: null,
  title: 'Knee Rehab — Pat',
  startDate: '2031-06-02',
  endDate: null,
  status: 'active',
  isArchived: false,
  allowSwaps: true,
  schedules: [
    version({
      days: [
        { weekday: 1, workoutId: 57 },
        { weekday: 3, workoutId: 58 },
      ],
    }),
  ],
  workouts: [
    { id: 57, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
    { id: 58, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
    { id: 59, assignedProgramId: 12, name: null, sortOrder: 2 },
  ],
  exercises: [HEEL, BRIDGE, CLAM],
  retiredExercises: [],
}

// Every request, as [method, path, body].
let requests: [string, string, string | undefined][]
// What each write and the preview answer — tests replace them. (A promise
// that hasn't settled stands for an answer still on its way.)
let answer: (method: string, path: string) => Response | Promise<Response>

beforeEach(() => {
  fetchMock.mockReset()
  requests = []
  answer = (method, path) => {
    if (method === 'GET' && path.endsWith('/removal')) {
      return json({ outcome: 'deleted', sessionCount: 0 })
    }
    return json(PROGRAM)
  }
  fetchMock.mockImplementation((input, init) => {
    const path = new URL(input as string, 'http://x').pathname
    const method = init?.method ?? 'GET'
    requests.push([method, path, init?.body as string | undefined])
    return Promise.resolve(answer(method, path))
  })
})

const writes = () => requests.filter(([method]) => method !== 'GET')
const previews = () =>
  requests.filter(([method, path]) => method === 'GET' && path.endsWith('/removal'))

// The page reads the program from its cache entry (as AssignedProgramDetailPage
// does), so what the editor writes there is what the section shows next.
function Harness() {
  const { data } = useAssignedProgram(12)
  if (!data) return null
  return (
    <ProgramExercisesSection
      program={data}
      isOpen={data.status === 'active' && !data.isArchived}
      today={TODAY}
    />
  )
}

function renderSection(program: AssignedProgramDetail = PROGRAM) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(assignedProgramQueryKey(12), program)
  render(
    <QueryClientProvider client={queryClient}>
      {/* The cards and Add cards are links (3b-1b): they need a router.
          `?tab=x` on the page's address shows that returnTo keeps the
          query, not only the path. */}
      <MemoryRouter initialEntries={['/practitioner/programs/assigned/12?tab=x']}>
        <Harness />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient, user: userEvent.setup() }
}

// --- THE EDITOR'S SHAPE ---------------------------------------------------------

describe('ProgramExercisesSection — the editor on an open program', () => {
  it("draws each workout's exercises with their drag handle, menu and Remove", () => {
    renderSection()
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toStrictEqual([
      'A · Mobility',
      'B · Strength',
      'C',
    ])
    expect(
      screen.getByRole('button', { name: 'Drag to reorder Glute Bridge in workout B · Strength' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'More actions for Glute Bridge in workout B · Strength' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }),
    ).toBeInTheDocument()
    // The program's own copy: prescription and notes.
    expect(screen.getByText('3 sets · 8 reps · 20 kg')).toBeInTheDocument()
    expect(screen.getByText('Keep the pelvis level.')).toBeInTheDocument()
  })

  // Step 3b-1b: each workout's Add card opens the program's add page FOR
  // that workout — the empty one too, where it is the only card.
  it("gives each workout an Add card for the program's add page, naming its workout", () => {
    renderSection()
    const addLinks = screen.getAllByRole('link', { name: /^Add New Exercise/ })
    expect(addLinks.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')])).toStrictEqual([
      ['Add New Exercise to workout A · Mobility', '/practitioner/programs/assigned/12/exercises/new?workoutId=57'],
      ['Add New Exercise to workout B · Strength', '/practitioner/programs/assigned/12/exercises/new?workoutId=58'],
      ['Add New Exercise to workout C', '/practitioner/programs/assigned/12/exercises/new?workoutId=59'],
    ])
    expect(screen.queryByText('No exercises in this workout.')).not.toBeInTheDocument()
  })

  it('names no workout in the Add link when the program has only one', () => {
    renderSection({ ...PROGRAM, workouts: [PROGRAM.workouts[0]], exercises: [HEEL] })
    expect(screen.getByRole('link', { name: 'Add New Exercise' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12/exercises/new',
    )
  })

  // The card's body opens the exercise's own page, which comes back here.
  it("links each card to the exercise's page, with the way back", () => {
    renderSection()
    const link = screen.getByRole('link', { name: /Glute Bridge/ })
    expect(link).toHaveAttribute(
      'href',
      `/practitioner/programs/assigned/12/exercises/102?returnTo=${encodeURIComponent('/practitioner/programs/assigned/12?tab=x')}`,
    )
  })

  // The limit sentence names the resource: "program" here, "template" on
  // the template page.
  it('says when the program has reached its 10 workouts', () => {
    const workouts = Array.from({ length: 10 }, (_, i) => ({
      id: 60 + i,
      assignedProgramId: 12,
      name: null,
      sortOrder: i,
    }))
    renderSection({ ...PROGRAM, workouts, exercises: [], schedules: [] })
    expect(screen.getByRole('button', { name: 'Add a workout' })).toBeDisabled()
    expect(screen.getByText('A program can have at most 10 workouts (A to J).')).toBeInTheDocument()
  })

  it('names the program, not a workout, when it has only one', () => {
    renderSection({ ...PROGRAM, workouts: [PROGRAM.workouts[0]], exercises: [HEEL] })
    expect(screen.getByRole('button', { name: 'Remove Heel Slides from program' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /More actions/ })).not.toBeInTheDocument()
  })

  // Only C — empty, unscheduled, keeping nothing — may be deleted.
  it('offers Delete only on a workout it may delete', () => {
    renderSection()
    expect(screen.getByRole('button', { name: 'Delete workout C' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete workout A/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Delete workout B/ })).not.toBeInTheDocument()
    expect(
      screen.getByText(
        "To delete a workout, move or remove its exercises first. A workout the schedule uses — now, planned or in its history — can't be deleted.",
      ),
    ).toBeInTheDocument()
  })

  it.each([
    [
      'it keeps a removed exercise',
      { retiredExercises: [exercise(104, 59, 'Band Walk', { retiredAt: '2031-06-10T10:00:00Z', retiredBy: 3 })] },
      "Keeps a removed exercise for its sessions' records, so it can't be deleted.",
    ],
    [
      'the schedule names it (here a past version)',
      {
        schedules: [
          version({ days: [{ weekday: 5, workoutId: 59 }] }),
          version({ id: 2, effectiveFrom: '2031-06-09', days: [{ weekday: 1, workoutId: 57 }] }),
        ],
      },
      "Part of the schedule — now, planned or in its history — so it can't be deleted. To stop using it, change the schedule.",
    ],
  ])('explains why an empty workout has no Delete when %s', (_label, change, note) => {
    renderSection({ ...PROGRAM, ...change })
    expect(screen.queryByRole('button', { name: 'Delete workout C' })).not.toBeInTheDocument()
    expect(screen.getByText(note)).toBeInTheDocument()
  })
})

// --- REMOVING ---------------------------------------------------------------------

describe('ProgramExercisesSection — removing an exercise', () => {
  it('asks the backend first, then deletes it and says so', async () => {
    let answerPreview: (r: Response) => void = () => {}
    answer = (method, path) => {
      if (method === 'GET' && path.endsWith('/removal')) {
        return new Promise<Response>((resolve) => (answerPreview = resolve))
      }
      return json({ ...PROGRAM, exercises: [HEEL, CLAM] })
    }
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    const dialog = await screen.findByRole('dialog')
    // While the answer is on its way: nothing to confirm yet.
    expect(within(dialog).getByText('Checking what this would do…')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Remove' })).toBeDisabled()
    expect(previews()).toStrictEqual([['GET', '/assigned-programs/12/exercises/102/removal', undefined]])

    // findBy: TanStack Query tells the component about the answer a moment
    // after it arrives, not inside the act().
    await act(async () => {
      answerPreview(json({ outcome: 'deleted', sessionCount: 0 }))
      await Promise.resolve()
    })
    expect(
      await within(dialog).findByText('No session has used it yet, so it will be deleted from the program.'),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    expect(writes()).toStrictEqual([['DELETE', '/assigned-programs/12/exercises/102', undefined]])
    expect(await screen.findByText('Removed Glute Bridge from the program.')).toBeInTheDocument()
    expect(screen.queryByText('Glute Bridge')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // Focus doesn't fall to the page: it goes to the NEXT exercise of the
    // workout (focusAfterRemoval) — once that button is on screen.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Clamshell from workout B · Strength' })).toHaveFocus(),
    )
  })

  it("puts focus on the previous exercise after removing a workout's last one", async () => {
    answer = (method, path) =>
      method === 'GET' && path.endsWith('/removal')
        ? json({ outcome: 'deleted', sessionCount: 0 })
        : json({ ...PROGRAM, exercises: [HEEL, BRIDGE] })
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Clamshell from workout B · Strength' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/will be deleted/)
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' })).toHaveFocus(),
    )
  })

  it("puts focus on the workout's Add card when its only exercise is removed", async () => {
    answer = (method, path) =>
      method === 'GET' && path.endsWith('/removal')
        ? json({ outcome: 'deleted', sessionCount: 0 })
        : json({ ...PROGRAM, exercises: [BRIDGE, CLAM] })
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Heel Slides from workout A · Mobility' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/will be deleted/)
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Add New Exercise to workout A · Mobility' })).toHaveFocus(),
    )
  })

  // Focus is moved ONCE. After it has moved, the list re-rendering — a
  // refetch bringing a changed program — must not pull it back.
  it('moves focus once, not again on a later update of the list', async () => {
    answer = (method, path) =>
      method === 'GET' && path.endsWith('/removal')
        ? json({ outcome: 'deleted', sessionCount: 0 })
        : json({ ...PROGRAM, exercises: [HEEL, CLAM] })
    const { user, queryClient } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/will be deleted/)
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    const clamshell = screen.getByRole('button', { name: 'Remove Clamshell from workout B · Strength' })
    await waitFor(() => expect(clamshell).toHaveFocus())

    // The practitioner moves on; then the program changes on the server.
    const heel = screen.getByRole('button', { name: 'Remove Heel Slides from workout A · Mobility' })
    heel.focus()
    // TanStack Query tells components about new data on a timer, not in the
    // same tick: wait for the list to have really re-rendered (Clamshell's
    // card shows 4 sets) before checking where focus is.
    act(() => {
      queryClient.setQueryData(assignedProgramQueryKey(12), {
        ...PROGRAM,
        exercises: [HEEL, { ...CLAM, sets: 4 }],
      })
    })
    expect(await screen.findByText(/^4 sets/)).toBeInTheDocument()
    expect(heel).toHaveFocus()
  })

  // Closing the dialog by hand gives focus back to the Remove button that
  // opened it — Radix's own behaviour, kept: only a SUCCESSFUL removal hands
  // focus to the list. Here after a failed attempt, the case the click's
  // memory (the card's `removing` ref) must not survive.
  it('gives focus back to Remove when the dialog is closed after a failure', async () => {
    answer = (method, path) =>
      method === 'GET' && path.endsWith('/removal')
        ? json({ outcome: 'deleted', sessionCount: 0 })
        : json({ statusCode: 409, message: ['This program is closed, so it can no longer change'] }, 409)
    const { user } = renderSection()
    const trigger = screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' })
    await user.click(trigger)
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/will be deleted/)
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })

  // A failed removal leaves the card, its dialog and the focus where they are.
  it('moves no focus when the removal fails', async () => {
    answer = (method, path) =>
      method === 'GET' && path.endsWith('/removal')
        ? json({ outcome: 'deleted', sessionCount: 0 })
        : json({ statusCode: 409, message: ['This program is closed, so it can no longer change'] }, 409)
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/will be deleted/)
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Clamshell from workout B · Strength', hidden: true })).not.toHaveFocus()
  })

  it('says it will be KEPT for its sessions, and then shows it among the removed', async () => {
    const kept = { ...BRIDGE, retiredAt: '2031-06-12T09:00:00Z', retiredBy: 3 }
    answer = (method, path) =>
      method === 'GET' && path.endsWith('/removal')
        ? json({ outcome: 'retired', sessionCount: 2 })
        : json({ ...PROGRAM, exercises: [HEEL, CLAM], retiredExercises: [kept] })
    const { user } = renderSection()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText(
        "2 sessions used it. It will leave the program — new sessions won't include it — and stay in those sessions' records.",
      ),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    expect(
      await screen.findByText(
        'Removed Glute Bridge from the program. It stays in the records of the sessions that used it.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Show 1 removed exercise' })).not.toBeChecked()
  })

  // A is Monday's workout today, and Heel Slides is all it has.
  it("warns when it would leave a workout the schedule uses with nothing in it", async () => {
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Heel Slides from workout A · Mobility' }))
    expect(
      await screen.findByText(
        "Workout A · Mobility will have no exercises left, and the schedule uses it: the patient won't be able to start its sessions until it has one again.",
      ),
    ).toBeInTheDocument()
  })

  // B keeps Clamshell: no warning for removing Glute Bridge.
  it('gives no warning when the workout keeps another exercise', async () => {
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/will be deleted/)
    expect(within(dialog).queryByText(/no exercises left/)).not.toBeInTheDocument()
  })

  it("keeps Remove disabled when it couldn't ask", async () => {
    answer = () => apiError(500, 'Internal server error')
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText("Couldn't check what this would do. Close this and try again."),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Remove' })).toBeDisabled()
  })

  it("shows a refusal in the dialog, and forgets it once the dialog is closed", async () => {
    answer = (method, path) =>
      method === 'GET' && path.endsWith('/removal')
        ? json({ outcome: 'retired', sessionCount: 1 })
        : apiError(409, 'This exercise was already removed from the program')
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    let dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/1 session used it/)
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "Couldn't remove it. This exercise was already removed from the program",
    )

    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }))
    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/1 session used it/)
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })

  // Each exercise has its OWN answer: opening another card's dialog must not
  // show the previous card's answer while its own is on its way (a cache
  // key naming only the program would — with Remove enabled).
  it("never shows another exercise's answer", async () => {
    let answerHeel: (r: Response) => void = () => {}
    answer = (_method, path) => {
      if (path.endsWith('/101/removal')) {
        return new Promise<Response>((resolve) => (answerHeel = resolve))
      }
      if (path.endsWith('/removal')) return json({ outcome: 'retired', sessionCount: 2 })
      return json(PROGRAM)
    }
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
    let dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/2 sessions used it/)
    await user.click(within(dialog).getByRole('button', { name: 'Keep it' }))

    await user.click(screen.getByRole('button', { name: 'Remove Heel Slides from workout A · Mobility' }))
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Checking what this would do…')).toBeInTheDocument()
    expect(within(dialog).queryByText(/2 sessions used it/)).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Remove' })).toBeDisabled()
    await act(async () => {
      answerHeel(json({ outcome: 'deleted', sessionCount: 0 }))
      await Promise.resolve()
    })
  })

  // A patient may have started a session since the last opening: the
  // answer could have changed.
  it('asks again each time the dialog opens', async () => {
    const { user } = renderSection()
    for (let opening = 0; opening < 2; opening++) {
      await user.click(screen.getByRole('button', { name: 'Remove Glute Bridge from workout B · Strength' }))
      const dialog = await screen.findByRole('dialog')
      await within(dialog).findByText(/will be deleted/)
      await user.click(within(dialog).getByRole('button', { name: 'Keep it' }))
    }
    expect(previews()).toHaveLength(2)
  })
})

// --- THE REMOVED EXERCISES ------------------------------------------------------

describe('ProgramExercisesSection — "Show N removed exercises"', () => {
  const BAND = exercise(104, 58, 'Band Walk', { retiredAt: '2031-06-10T10:00:00Z', retiredBy: 3 })

  it('hides them by default, and shows when and where on request', async () => {
    const { user } = renderSection({ ...PROGRAM, retiredExercises: [BAND] })
    expect(screen.queryByText('Band Walk')).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Show 1 removed exercise' }))
    const removed = screen.getByRole('region', { name: 'Removed exercises' })
    expect(within(removed).getByText('Band Walk')).toBeInTheDocument()
    expect(within(removed).getByText('Removed June 10, 2031 · was in workout B · Strength')).toBeInTheDocument()
    // Only a record: nothing to do with it.
    expect(within(removed).queryByRole('button')).not.toBeInTheDocument()
  })

  it('counts them in the label', () => {
    renderSection({ ...PROGRAM, retiredExercises: [BAND, { ...BAND, id: 105, name: 'Step-up' }] })
    expect(screen.getByRole('checkbox', { name: 'Show 2 removed exercises' })).toBeInTheDocument()
  })

  it('offers them on a CLOSED program too — read-only like the rest', async () => {
    const { user } = renderSection({ ...PROGRAM, status: 'completed', retiredExercises: [BAND] })
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Show 1 removed exercise' }))
    expect(screen.getByText('Band Walk')).toBeInTheDocument()
  })
})

// --- THE PROGRAM'S ROUTES -------------------------------------------------------
//
// Each editing action reaches the PROGRAM route (the template's are tested
// on the template page): the exact request, as a literal string.

describe('ProgramExercisesSection — requests', () => {
  async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(await screen.findByRole('button', { name }))
    return screen.findByRole('menu')
  }

  it('moves an exercise to another workout', async () => {
    const { user } = renderSection()
    const menu = await openMenu(user, 'More actions for Glute Bridge in workout B · Strength')
    await user.click(within(menu).getByRole('menuitem', { name: 'Move to A · Mobility' }))
    expect(writes()).toStrictEqual([['PATCH', '/assigned-programs/12/exercises/102', '{"workoutId":57}']])
    expect(await screen.findByText('Moved Glute Bridge to A · Mobility.')).toBeInTheDocument()
  })

  // The same exercise and prescription, nulls included — and NO position:
  // the backend appends (step 3b-0).
  it('copies an exercise to another workout, sending no position', async () => {
    const { user } = renderSection()
    const menu = await openMenu(user, 'More actions for Glute Bridge in workout B · Strength')
    await user.click(within(menu).getByRole('menuitem', { name: 'Copy to C' }))
    expect(writes()).toStrictEqual([
      [
        'POST',
        '/assigned-programs/12/exercises',
        '{"exerciseId":202,"workoutId":59,"sets":3,"reps":8,"durationInSeconds":null,"weight":20,"weightUnit":"kg","notes":"Keep the pelvis level."}',
      ],
    ])
  })

  it('adds a workout, renames one, and deletes one', async () => {
    const { user } = renderSection()
    await user.click(screen.getByRole('button', { name: 'Add a workout' }))
    await user.click(screen.getByRole('button', { name: 'Delete workout C' }))
    await user.click(screen.getByRole('button', { name: 'Rename workout A · Mobility' }))
    const input = screen.getByRole('textbox', { name: 'Name of workout A' })
    await user.clear(input)
    await user.type(input, 'Upper{Enter}')
    await screen.findByRole('button', { name: 'Rename workout A · Mobility' })
    expect(writes()).toStrictEqual([
      ['POST', '/assigned-programs/12/workouts', '{}'],
      ['DELETE', '/assigned-programs/12/workouts/59', undefined],
      ['PATCH', '/assigned-programs/12/workouts/57', '{"name":"Upper"}'],
    ])
  })

  // The two drags: jsdom can't drag, so the hook is driven directly (the
  // template hook's tests cover the guess and the rollback; these, the
  // program's routes).
  it('reorders workouts and exercises through the program routes', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(assignedProgramQueryKey(12), PROGRAM)
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useProgramWorkoutEditing(12), { wrapper })
    await act(async () => {
      await result.current.reorderWorkouts.mutateAsync([58, 57, 59])
      await result.current.reorderExercises.mutateAsync({ workoutId: 58, order: [103, 102] })
    })
    expect(writes()).toStrictEqual([
      ['PATCH', '/assigned-programs/12/workouts', '{"order":[58,57,59]}'],
      ['PATCH', '/assigned-programs/12/exercises', '{"workoutId":58,"order":[103,102]}'],
    ])
  })
})