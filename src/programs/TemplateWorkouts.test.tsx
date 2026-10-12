import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import { TemplateDetailPage } from './TemplateDetailPage'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { ProgramTemplateDetail, TemplateExercise, TemplateWorkout } from './types'

// The workouts part of the template page (step 3a-w): grouping, the
// workout headers, adding / renaming / deleting workouts, and moving or
// copying exercises between them. The page's older behaviour (title,
// permissions, one-workout list) is in TemplateDetailPage.test.tsx.
//
// Dragging can't be simulated in jsdom (dnd-kit measures real layout); the
// drags' requests and on-screen guesses are tested on the hook
// (useTemplateWorkoutEditing.test.tsx) and their order rules as pure
// functions — and the drags themselves were checked in Chromium.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

// Workout ids far from positions and from exercise ids, so nothing passes
// by confusing one for another.
const A: TemplateWorkout = { id: 57, templateId: 1, name: 'Mobility', sortOrder: 0 }
const B: TemplateWorkout = { id: 58, templateId: 1, name: null, sortOrder: 1 }

function row(id: number, workoutId: number, sortOrder: number, name: string): TemplateExercise {
  return {
    id,
    templateId: 1,
    workoutId,
    exerciseId: id + 100,
    sets: null,
    reps: null,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    sortOrder,
    notes: null,
    exercise: { id: id + 100, name, primaryMuscles: [] },
  }
}

function makeTemplate(overrides: Partial<ProgramTemplateDetail> = {}): ProgramTemplateDetail {
  return {
    id: 1,
    practitionerId: 7,
    title: 'Knee Rehab',
    description: null,
    isArchived: false,
    workouts: [A, B],
    exercises: [row(1, 57, 0, 'Squat'), row(2, 57, 1, 'Lunge'), row(3, 58, 0, 'Bridge')],
    ...overrides,
  }
}

const owner = { id: 7, activeRole: 'practitioner' }
const colleague = { id: 999, activeRole: 'practitioner' }

// The first request answers with `initial`; each later one goes to
// `respond` (or fails the test loudly if none was expected).
function serve(
  initial: ProgramTemplateDetail,
  respond?: (url: string, init: RequestInit | undefined) => Response,
) {
  fetchMock.mockImplementation((input, init) => {
    // apiRequest always passes the URL as a string (never a Request object).
    const url = input as string
    const method = init?.method ?? 'GET'
    if (method === 'GET' && /\/programs\/1$/.test(url)) {
      return Promise.resolve(jsonResponse(initial))
    }
    if (respond) return Promise.resolve(respond(url, init))
    return Promise.reject(new Error(`Unexpected request in test: ${method} ${url}`))
  })
}

function renderPage(currentUser: { id: number; activeRole: string } = owner) {
  // The app's own staleTime (30 s), so a missing cache write can't hide
  // behind an automatic refetch.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(currentUserQueryKey, currentUser)
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practitioner/programs/templates/1']}>
        <Routes>
          <Route path="/practitioner/programs/templates/:id" element={<TemplateDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { queryClient }
}

const workoutSection = (label: string) => screen.getByRole('region', { name: `Workout ${label}` })

// Checks a section's links, in page order, by the names a screen reader
// announces: each expected name must find exactly the link at that place.
// (getByRole computes accessible names the way a browser does — an
// aria-label wins over the visible text.)
function expectLinksInOrder(section: HTMLElement, names: (string | RegExp)[]) {
  const links = within(section).getAllByRole('link')
  expect(links).toHaveLength(names.length)
  names.forEach((name, index) => {
    expect(links[index]).toBe(within(section).getByRole('link', { name }))
  })
}

// The requests after the initial load, as "METHOD path body".
function laterRequests() {
  return fetchMock.mock.calls.slice(1).map(([input, init]) => {
    // A string URL and a string (JSON) body: what apiRequest always sends.
    const path = (input as string).replace(/^.*?(\/programs)/, '$1')
    const body = (init?.body as string | undefined) ?? ''
    return `${init?.method ?? 'GET'} ${path} ${body}`.trim()
  })
}

describe('Template workouts — one workout', () => {
  it('shows no workout header, and offers "Add a workout" with what workouts are for', async () => {
    serve(makeTemplate({ workouts: [A], exercises: [row(1, 57, 0, 'Squat')] }))
    renderPage()
    await screen.findByText('Squat')

    expect(screen.queryByRole('region', { name: /^Workout / })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /More actions/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Squat from template' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add a workout' })).toBeEnabled()
    expect(screen.getByText(/Workouts let different days use different exercises/)).toBeInTheDocument()
  })

  it('"Add a workout" adds one and the page turns into workouts A and B', async () => {
    serve(makeTemplate({ workouts: [A], exercises: [row(1, 57, 0, 'Squat')] }), () =>
      jsonResponse(makeTemplate({ workouts: [A, B], exercises: [row(1, 57, 0, 'Squat')] }), 201),
    )
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Squat')

    await user.click(screen.getByRole('button', { name: 'Add a workout' }))

    expect(await screen.findByRole('region', { name: 'Workout B' })).toBeInTheDocument()
    expect(laterRequests()).toStrictEqual(['POST /programs/1/workouts {}'])
    expect(within(workoutSection('A · Mobility')).getByText('Squat')).toBeInTheDocument()
  })

  it('reports a refused "Add a workout" with the backend\'s reason', async () => {
    serve(makeTemplate({ workouts: [A] }), () =>
      jsonResponse({ statusCode: 400, message: ['A program can have at most 10 workouts'] }, 400),
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Add a workout' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't add a workout. A program can have at most 10 workouts",
    )
  })
})

describe('Template workouts — several workouts', () => {
  it("groups the exercises under their workout's header, each workout with its own Add card", async () => {
    serve(makeTemplate())
    renderPage()
    await screen.findByText('Squat')

    const a = workoutSection('A · Mobility')
    expect(within(a).getByRole('heading', { name: 'A · Mobility' })).toBeInTheDocument()
    expectLinksInOrder(a, [/Squat/, /Lunge/, 'Add New Exercise to workout A · Mobility'])
    const b = workoutSection('B')
    expect(within(b).getByText('Bridge')).toBeInTheDocument()
    expect(
      within(b).getByRole('link', { name: 'Add New Exercise to workout B' }),
    ).toHaveAttribute('href', '/practitioner/programs/templates/1/exercises/new?workoutId=58')
  })

  it("names each card's buttons with its workout — a copy can put the same exercise in two", async () => {
    serve(makeTemplate())
    renderPage()
    await screen.findByText('Squat')

    expect(screen.getByRole('button', { name: 'Drag to reorder Squat in workout A · Mobility' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Bridge from workout B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'More actions for Bridge in workout B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Drag to reorder workout A · Mobility' })).toBeInTheDocument()
  })

  it('removing an exercise sends the DELETE for that row', async () => {
    serve(makeTemplate(), () => jsonResponse(makeTemplate({ exercises: [row(1, 57, 0, 'Squat'), row(2, 57, 1, 'Lunge')] })))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Remove Bridge from workout B' }))

    await waitFor(() => expect(screen.queryByText('Bridge')).not.toBeInTheDocument())
    expect(laterRequests()).toStrictEqual(['DELETE /programs/1/exercises/3'])
  })

  it('offers Delete only on an empty workout, and explains how to empty one', async () => {
    const C: TemplateWorkout = { id: 59, templateId: 1, name: null, sortOrder: 2 }
    serve(makeTemplate({ workouts: [A, B, C] }))
    renderPage()
    await screen.findByText('Squat')

    expect(screen.queryByRole('button', { name: 'Delete workout A · Mobility' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete workout B' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete workout C' })).toBeInTheDocument()
    expect(screen.getByText('To delete a workout, move or remove its exercises first.')).toBeInTheDocument()
    // Its only content is the Add card, first.
    expectLinksInOrder(workoutSection('C'), ['Add New Exercise to workout C'])
  })

  it('deleting the empty workout sends the DELETE; down to one, the page has no headers again', async () => {
    serve(makeTemplate({ exercises: [row(1, 57, 0, 'Squat')] }), () =>
      jsonResponse(makeTemplate({ workouts: [A], exercises: [row(1, 57, 0, 'Squat')] })),
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Delete workout B' }))

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /^Workout / })).not.toBeInTheDocument(),
    )
    expect(laterRequests()).toStrictEqual(['DELETE /programs/1/workouts/58'])
  })

  it("shows the backend's reason when a delete is refused", async () => {
    serve(makeTemplate({ exercises: [row(1, 57, 0, 'Squat')] }), () =>
      jsonResponse(
        { statusCode: 409, message: ['Workout B still has exercises: move or remove them first'] },
        409,
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Delete workout B' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't delete that workout. Workout B still has exercises: move or remove them first",
    )
  })

  it('stops offering "Add a workout" at 10, and says why', async () => {
    const ten = Array.from({ length: 10 }, (_, index) => ({
      id: 60 + index,
      templateId: 1,
      name: null,
      sortOrder: index,
    }))
    serve(makeTemplate({ workouts: ten, exercises: [] }))
    renderPage()
    await screen.findByRole('region', { name: 'Workout J' })

    expect(screen.getByRole('button', { name: 'Add a workout' })).toBeDisabled()
    expect(screen.getByText('A template can have at most 10 workouts (A to J).')).toBeInTheDocument()
  })
})

describe('Template workouts — renaming', () => {
  it('saves a typed name with Enter and shows it in the header', async () => {
    serve(makeTemplate(), () => jsonResponse(makeTemplate({ workouts: [A, { ...B, name: 'Strength' }] })))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Rename workout B' }))

    const input = screen.getByRole('textbox', { name: 'Name of workout B' })
    expect(input).toHaveValue('')
    await user.type(input, '  Strength {Enter}')

    expect(await screen.findByRole('heading', { name: 'B · Strength' })).toBeInTheDocument()
    expect(laterRequests()).toStrictEqual(['PATCH /programs/1/workouts/58 {"name":"Strength"}'])
  })

  it('clears the name when the field is emptied — sent as null, not ""', async () => {
    serve(makeTemplate(), () => jsonResponse(makeTemplate({ workouts: [{ ...A, name: null }, B] })))
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Rename workout A · Mobility' }))

    const input = screen.getByRole('textbox', { name: 'Name of workout A' })
    expect(input).toHaveValue('Mobility')
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Save the name of workout A' }))

    expect(await screen.findByRole('heading', { name: 'A' })).toBeInTheDocument()
    expect(laterRequests()).toStrictEqual(['PATCH /programs/1/workouts/57 {"name":null}'])
  })

  it('refuses a name over 100 characters without sending it', async () => {
    serve(makeTemplate())
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Rename workout B' }))

    const input = screen.getByRole('textbox', { name: 'Name of workout B' })
    // 101 characters, pasted (typing them one by one is slow for nothing).
    await user.click(input)
    await user.paste('x'.repeat(101))
    await user.keyboard('{Enter}')

    expect(screen.getByText('A workout name can be at most 100 characters')).toBeInTheDocument()
    expect(laterRequests()).toStrictEqual([])

    // Typing again clears the message; 100 characters exactly is allowed.
    await user.keyboard('{Backspace}')
    expect(screen.queryByText('A workout name can be at most 100 characters')).not.toBeInTheDocument()
    await user.keyboard('{Enter}')
    await waitFor(() =>
      expect(laterRequests()).toStrictEqual([
        `PATCH /programs/1/workouts/58 {"name":"${'x'.repeat(100)}"}`,
      ]),
    )
  })

  it('Escape cancels without sending anything', async () => {
    serve(makeTemplate())
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Rename workout B' }))
    await user.type(screen.getByRole('textbox', { name: 'Name of workout B' }), 'Strength{Escape}')

    expect(screen.getByRole('heading', { name: 'B' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Name of workout B' })).not.toBeInTheDocument()
    expect(laterRequests()).toStrictEqual([])
  })

  it("shows a refused rename under that workout's field, and stays editing", async () => {
    serve(makeTemplate(), () =>
      jsonResponse({ statusCode: 404, message: ['Workout 58 not found in this template'] }, 404),
    )
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Rename workout B' }))
    await user.type(screen.getByRole('textbox', { name: 'Name of workout B' }), 'Strength{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Workout 58 not found in this template')
    expect(screen.getByRole('textbox', { name: 'Name of workout B' })).toHaveValue('Strength')

    // Cancelled and reopened: a fresh start, without the old error.
    await user.click(screen.getByRole('button', { name: 'Cancel renaming workout B' }))
    await user.click(screen.getByRole('button', { name: 'Rename workout B' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Template workouts — moving and copying', () => {
  // Radix renders an open menu in a portal and marks the rest of the page
  // aria-hidden, hence `hidden: true` is not needed for the items (they're
  // in the visible menu) but the menu must be opened first.
  async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
    await user.click(await screen.findByRole('button', { name }))
    return screen.findByRole('menu')
  }

  it("offers only the OTHER workouts, to move to and to copy to", async () => {
    const C: TemplateWorkout = { id: 59, templateId: 1, name: 'Core', sortOrder: 2 }
    serve(makeTemplate({ workouts: [A, B, C] }))
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user, 'More actions for Bridge in workout B')

    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toStrictEqual([
      'Move to A · Mobility',
      'Move to C · Core',
      'Copy to A · Mobility',
      'Copy to C · Core',
    ])
  })

  it('Move sends only the target workout, and says where the exercise went', async () => {
    serve(makeTemplate(), () =>
      jsonResponse(
        makeTemplate({ exercises: [row(2, 57, 0, 'Lunge'), row(3, 58, 0, 'Bridge'), row(1, 58, 1, 'Squat')] }),
      ),
    )
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user, 'More actions for Squat in workout A · Mobility')
    await user.click(within(menu).getByRole('menuitem', { name: 'Move to B' }))

    expect(await screen.findByText('Moved Squat to B.')).toBeInTheDocument()
    expect(within(workoutSection('B')).getByText('Squat')).toBeInTheDocument()
    expect(laterRequests()).toStrictEqual(['PATCH /programs/1/exercises/1 {"workoutId":58}'])
  })

  it("Copy sends the same exercise and prescription to the end of the target workout, and says it's independent", async () => {
    // B holds positions 0 and 2 (one was removed): the copy goes to 3 —
    // not to B's count (2), nor to the template's (4).
    const squat = {
      ...row(1, 57, 0, 'Squat'),
      sets: 3,
      reps: 10,
      weight: 20,
      weightUnit: 'kg' as const,
      notes: 'Slowly',
    }
    serve(
      makeTemplate({
        exercises: [squat, row(2, 57, 1, 'Lunge'), row(3, 58, 0, 'Bridge'), row(4, 58, 2, 'Plank')],
      }),
      () => jsonResponse(makeTemplate(), 201),
    )
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user, 'More actions for Squat in workout A · Mobility')
    await user.click(within(menu).getByRole('menuitem', { name: 'Copy to B' }))

    expect(
      await screen.findByText(
        "Copied Squat to B. The copy is independent: changing one won't change the other.",
      ),
    ).toBeInTheDocument()
    expect(laterRequests()).toStrictEqual([
      'POST /programs/1/exercises {"exerciseId":101,"workoutId":58,"sets":3,"reps":10,"durationInSeconds":null,"weight":20,"weightUnit":"kg","notes":"Slowly","sortOrder":3}',
    ])
  })

  it('reports a failed move with what failed and why', async () => {
    serve(makeTemplate(), () =>
      jsonResponse({ statusCode: 404, message: ['Workout 58 not found in this template'] }, 404),
    )
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user, 'More actions for Squat in workout A · Mobility')
    await user.click(within(menu).getByRole('menuitem', { name: 'Move to B' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't move Squat. Workout 58 not found in this template",
    )
    expect(screen.queryByText(/^Moved/)).not.toBeInTheDocument()
  })

  it('reports a failed copy, and a server error as "Try again."', async () => {
    serve(makeTemplate(), () => jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500))
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user, 'More actions for Squat in workout A · Mobility')
    await user.click(within(menu).getByRole('menuitem', { name: 'Copy to B' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't copy Squat. Try again.")
  })

  it("clears the last action's message when the next one starts", async () => {
    let answer: Response = jsonResponse(makeTemplate(), 201)
    serve(makeTemplate(), () => answer)
    const user = userEvent.setup()
    renderPage()
    let menu = await openMenu(user, 'More actions for Squat in workout A · Mobility')
    await user.click(within(menu).getByRole('menuitem', { name: 'Copy to B' }))
    await screen.findByText(/^Copied Squat to B/)

    answer = jsonResponse({ statusCode: 404, message: ['Workout 58 not found in this template'] }, 404)
    menu = await openMenu(user, 'More actions for Lunge in workout A · Mobility')
    await user.click(within(menu).getByRole('menuitem', { name: 'Move to B' }))

    await screen.findByRole('alert')
    expect(screen.queryByText(/^Copied Squat/)).not.toBeInTheDocument()

    // …and the error goes too when the next action starts.
    answer = jsonResponse(makeTemplate(), 201)
    menu = await openMenu(user, 'More actions for Lunge in workout A · Mobility')
    await user.click(within(menu).getByRole('menuitem', { name: 'Copy to B' }))
    await screen.findByText(/^Copied Lunge to B/)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('while a move is on its way, nothing else that moves things can start', async () => {
    const C: TemplateWorkout = { id: 59, templateId: 1, name: null, sortOrder: 2 }
    let answer: (response: Response) => void = () => {}
    // The move's request is answered by hand (mockImplementationOnce below).
    serve(makeTemplate({ workouts: [A, B, C] }))
    const user = userEvent.setup()
    renderPage()
    const menu = await openMenu(user, 'More actions for Squat in workout A · Mobility')
    fetchMock.mockImplementationOnce(() => new Promise<Response>((resolve) => (answer = resolve)))
    await user.click(within(menu).getByRole('menuitem', { name: 'Move to B' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'More actions for Lunge in workout A · Mobility' })).toBeDisabled(),
    )
    expect(screen.getByRole('button', { name: 'Add a workout' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete workout C' })).toBeDisabled()

    answer(jsonResponse(makeTemplate({ workouts: [A, B, C] })))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add a workout' })).toBeEnabled())
  })
})

describe("Template workouts — someone else's template", () => {
  it('shows the workouts and their exercises with no way to change them', async () => {
    serve(makeTemplate({ exercises: [row(1, 57, 0, 'Squat')] }))
    renderPage(colleague)
    await screen.findByText('Squat')

    expect(within(workoutSection('A · Mobility')).getByText('Squat')).toBeInTheDocument()
    expect(within(workoutSection('B')).getByText('No exercises in this workout.')).toBeInTheDocument()
    for (const name of [/^Rename workout/, /^Delete workout/, /^Drag to reorder/, /^More actions/, 'Add a workout']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: /^Add New Exercise/ })).not.toBeInTheDocument()
  })
})