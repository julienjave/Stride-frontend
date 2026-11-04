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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { AssignedProgramExercisePage } from './AssignedProgramExercisePage'
import { expectProgramLoadError, expectProgramNotAvailable } from './programNotAvailableAssertions'
import type { AssignedProgramDetail, AssignedProgramExercise } from './types'

// One exercise of a program: its description (step D-3) and its
// prescription (step 3b-1b). The per-field editors are the library's and the
// template's (tested with a mock `save` in src/exercises/EditableExercise*
// and src/programs/Editable*Field.test); here, what the PROGRAM's page adds:
// the request each save becomes (literal bodies), the answer written where
// the page reads it, the program's own copy of the description, a closed
// program, removed exercises, and a safe way back.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function apiError(statusCode: number, message: string) {
  return json({ statusCode, message: [message], error: 'Error' }, statusCode)
}

function exercise(id: number, fields: Partial<AssignedProgramExercise> = {}): AssignedProgramExercise {
  return {
    id,
    assignedProgramId: 12,
    workoutId: 57,
    exerciseId: 5,
    name: 'Glute Bridge',
    primaryMuscles: ['glutes'],
    secondaryMuscles: ['hamstrings'],
    equipment: [],
    instructions: ['Lie on your back', 'Lift your hips'],
    sets: 3,
    reps: 10,
    durationInSeconds: null,
    weight: 20,
    weightUnit: 'kg',
    sortOrder: 0,
    notes: 'Keep the pelvis level.',
    retiredAt: null,
    retiredBy: null,
    images: [],
    useLibraryImages: true,
    ownImages: [],
    ...fields,
  }
}

const BRIDGE = exercise(101)
const REMOVED = exercise(102, {
  name: 'Heel Slides',
  retiredAt: '2031-06-10T09:00:00Z',
  retiredBy: 3,
})

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
  lateMakeUpDays: null,
  schedules: [],
  workouts: [{ id: 57, assignedProgramId: 12, name: null, sortOrder: 0 }],
  exercises: [BRIDGE],
  retiredExercises: [REMOVED],
}

let requests: [string, string, string | undefined][]
let program: () => Response
// The PATCH's answer: by default the program with the change applied, as
// the backend would answer.
let patchAnswer: (body: Record<string, unknown>) => Response | Promise<Response>

// GET /users/6 — the program's patient: only `isActive` matters here
// (decisions §22 — a deactivated patient's program can't change).
let patientActive: boolean
const patientAnswer = () =>
  json({ id: 6, firstName: 'Pat', lastName: 'Lee', roles: ['patient'], isActive: patientActive })

beforeEach(() => {
  fetchMock.mockReset()
  requests = []
  patientActive = true
  program = () => json(PROGRAM)
  patchAnswer = (body) => json({ ...PROGRAM, exercises: [{ ...BRIDGE, ...body }] })
  fetchMock.mockImplementation((input, init) => {
    const path = new URL(input as string, 'http://x').pathname
    const method = init?.method ?? 'GET'
    const body = init?.body as string | undefined
    requests.push([method, path, body])
    if (method === 'GET' && path === '/assigned-programs/12') return Promise.resolve(program())
    if (method === 'GET' && path === '/users/6') return Promise.resolve(patientAnswer())
    if (method === 'PATCH' && path === '/assigned-programs/12/exercises/101') {
      return Promise.resolve(patchAnswer(JSON.parse(body ?? '{}') as Record<string, unknown>))
    }
    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${path}`))
  })
})

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, { id: 3, preferredWeightUnit: 'kg' })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/programs/assigned/:id/exercises/:rowId"
            element={<AssignedProgramExercisePage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const PAGE = '/practitioner/programs/assigned/12/exercises/101'
const NOTE =
  "This description is this program's own copy: changing it doesn't change the exercise in the library or in other programs. Sessions already done keep the description they were given."
const patches = () => requests.filter(([method]) => method === 'PATCH')

describe('AssignedProgramExercisePage — reading', () => {
  it.each([['/practitioner/programs/assigned/abc/exercises/101'], ['/practitioner/programs/assigned/12/exercises/0']])(
    'says an address that names no exercise is not available — asking nothing (%s)',
    async (path) => {
      renderAt(path)
      await expectProgramNotAvailable()
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it("shows the program's own copy of the exercise and its prescription", async () => {
    renderAt(PAGE)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Knee Rehab — Pat' }),
    ).toBeInTheDocument()
    expect(screen.getByText('- Edit Exercise -')).toBeInTheDocument()
    // The exercise is a section of the program's page: an h2 under its h1.
    expect(screen.getByRole('heading', { level: 2, name: 'Glute Bridge' })).toBeInTheDocument()
    expect(screen.getByText('glutes')).toBeInTheDocument()
    expect(screen.getByText('hamstrings')).toBeInTheDocument()
    expect(screen.getByText('None')).toBeInTheDocument() // no equipment
    expect(screen.getByText('Lift your hips')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20 kg')).toBeInTheDocument()
    expect(screen.getByText('Keep the pelvis level.')).toBeInTheDocument()
    // Whose description this is, and what a change does to sessions already
    // done (D-2's copies, 3b-0's).
    expect(screen.getByText(NOTE)).toBeInTheDocument()
    expect(
      screen.getByText(
        'Changes apply to the next sessions. Sessions already done keep the prescription they were given.',
      ),
    ).toBeInTheDocument()
  })

  it.each([
    ['completed', { status: 'completed' }],
    ['cancelled', { status: 'cancelled' }],
    ['deleted', { isArchived: true }],
  ])('is read-only on a %s program', async (_label, change) => {
    program = () => json({ ...PROGRAM, ...change })
    renderAt(PAGE)

    expect(await screen.findByText('- View Exercise -')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
    expect(screen.getByText('This program is closed: its exercises can no longer change.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back' })).toBeInTheDocument()
  })

  // An OPEN program of a deactivated patient: read-only too (the backend
  // answers 409), with its own reason.
  it("is read-only on a deactivated patient's open program, saying why", async () => {
    patientActive = false
    renderAt(PAGE)

    expect(
      await screen.findByText(
        "This patient's account is deactivated: the program's exercises can't change until an admin reactivates it.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('- View Exercise -')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.queryByText('This program is closed: its exercises can no longer change.')).not.toBeInTheDocument()
  })

  // The photos the patient sees, and — while the program is open — which ones
  // (program-specific photos, 2026-10-17): the library's (live) or this
  // patient's own. The choice is saved at once and NOT optimistically: the
  // checked radio is always what the server holds.
  describe('photos', () => {
    const LIBRARY_NOTE =
      'These photos come from the exercise in the library, so a change there shows here too.'
    const OWN_NOTE =
      "These are this patient's own photos: a change in the library doesn't reach them."
    const NONE_NOTE =
      "The patient sees no photos: this patient's own photos are chosen, and there are none yet."
    const OWN = [
      { objectKey: 'patients/6/exercise-photos/a.png', url: 'https://storage.example/own-a.png' },
      { objectKey: 'patients/6/exercise-photos/b.png', url: 'https://storage.example/own-b.png' },
    ]
    const LIBRARY = [
      { url: 'https://storage.example/bridge-1.jpg' },
      { url: 'https://storage.example/bridge-2.jpg' },
    ]
    // The exercise as the backend answers it: `images` = what the patient
    // sees, chosen by `useLibraryImages`; `ownImages` either way.
    const answer = (useLibraryImages: boolean, ownImages = OWN, change: Partial<AssignedProgramDetail> = {}) =>
      json({
        ...PROGRAM,
        ...change,
        exercises: [
          {
            ...BRIDGE,
            useLibraryImages,
            ownImages,
            images: useLibraryImages ? LIBRARY : ownImages.map(({ url }) => ({ url })),
          },
        ],
      })
    const libraryRadio = () => screen.getByRole('radio', { name: 'Photos from the library' })
    const ownRadio = () => screen.getByRole('radio', { name: "This patient's own photos" })

    it("shows the library's photos, the choice, and where they come from", async () => {
      program = () => answer(true)
      renderAt(PAGE)

      expect(await screen.findByRole('heading', { level: 3, name: 'Photos' })).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Which photos does the patient see?' })).toBeInTheDocument()
      expect(libraryRadio()).toBeChecked()
      expect(ownRadio()).not.toBeChecked()
      expect(screen.getByAltText('Glute Bridge photo 1')).toHaveAttribute(
        'src',
        'https://storage.example/bridge-1.jpg',
      )
      expect(screen.getByText('1 / 2')).toBeInTheDocument()
      expect(screen.getByText(LIBRARY_NOTE)).toBeInTheDocument()
      expect(screen.queryByText(OWN_NOTE)).not.toBeInTheDocument()
      expect(screen.queryByText(NONE_NOTE)).not.toBeInTheDocument()
    })

    it("shows this patient's own photos when they are chosen", async () => {
      program = () => answer(false)
      renderAt(PAGE)

      expect(await screen.findByText(OWN_NOTE)).toBeInTheDocument()
      expect(ownRadio()).toBeChecked()
      expect(libraryRadio()).not.toBeChecked()
      expect(screen.getByAltText('Glute Bridge photo 1')).toHaveAttribute(
        'src',
        'https://storage.example/own-a.png',
      )
      expect(screen.queryByText(LIBRARY_NOTE)).not.toBeInTheDocument()
    })

    // Chosen, none yet: the patient sees nothing — said as a consequence of
    // the choice, never as "the library has none".
    it("says the patient sees none when their own photos are chosen and there are none", async () => {
      program = () => answer(false, [])
      renderAt(PAGE)

      expect(await screen.findByText(NONE_NOTE)).toBeInTheDocument()
      expect(screen.getByText('No photos for this patient yet.')).toBeInTheDocument()
      expect(screen.queryByText('This exercise has no photos in the library.')).not.toBeInTheDocument()
      expect(screen.queryByText(OWN_NOTE)).not.toBeInTheDocument()
    })

    it('says the library has none, when it has none', async () => {
      // No own photos, and none in the library either.
      program = () =>
        json({ ...PROGRAM, exercises: [{ ...BRIDGE, useLibraryImages: true, ownImages: [], images: [] }] })
      renderAt(PAGE)

      expect(await screen.findByText('This exercise has no photos in the library.')).toBeInTheDocument()
      expect(screen.queryByText('No photos for this patient yet.')).not.toBeInTheDocument()
      expect(screen.getByText(LIBRARY_NOTE)).toBeInTheDocument()
    })

    // Saved at once; the radios show the SERVER's choice — while the answer
    // is held, the old one is still checked and both are disabled.
    it('saves the choice at once, showing the new one only once the server holds it', async () => {
      program = () => answer(true)
      let release!: () => void
      patchAnswer = () => answer(false)
      const held = new Promise<void>((resolve) => {
        release = resolve
      })
      fetchMock.mockImplementation((input, init) => {
        const path = new URL(input as string, 'http://x').pathname
        const method = init?.method ?? 'GET'
        requests.push([method, path, init?.body as string | undefined])
        if (method === 'GET') return Promise.resolve(program())
        return held.then(() => patchAnswer({}))
      })
      const user = renderAt(PAGE)

      await user.click(await screen.findByRole('radio', { name: "This patient's own photos" }))

      expect(patches()).toEqual([
        ['PATCH', '/assigned-programs/12/exercises/101', '{"useLibraryImages":false}'],
      ])
      expect(screen.getByRole('status')).toHaveTextContent('Saving…')
      expect(libraryRadio()).toBeChecked()
      expect(ownRadio()).not.toBeChecked()
      expect(libraryRadio()).toBeDisabled()
      expect(ownRadio()).toBeDisabled()

      release()
      await waitFor(() => expect(ownRadio()).toBeChecked())
      expect(libraryRadio()).not.toBeChecked()
      expect(ownRadio()).toBeEnabled()
      expect(screen.getByText(OWN_NOTE)).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('says why a choice was refused, keeping the old one', async () => {
      program = () => answer(false)
      patchAnswer = () => apiError(409, 'This program is closed, so it can no longer change')
      const user = renderAt(PAGE)

      await user.click(await screen.findByRole('radio', { name: 'Photos from the library' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Couldn't change the photos. This program is closed, so it can no longer change",
      )
      expect(ownRadio()).toBeChecked()
      expect(patches()).toEqual([
        ['PATCH', '/assigned-programs/12/exercises/101', '{"useLibraryImages":true}'],
      ])
    })

    it("hides a server failure's details", async () => {
      program = () => answer(true)
      patchAnswer = () => apiError(500, 'Internal server error')
      const user = renderAt(PAGE)

      await user.click(await screen.findByRole('radio', { name: "This patient's own photos" }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Couldn't change the photos. Something went wrong on our side. Try again in a moment.",
      )
    })

    // No answer at all: what failed, then "Try again." — nothing came back.
    it('says what failed, and to try again, when no answer comes', async () => {
      program = () => answer(true)
      patchAnswer = () => Promise.reject(new TypeError('Failed to fetch'))
      const user = renderAt(PAGE)

      await user.click(await screen.findByRole('radio', { name: "This patient's own photos" }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /^Couldn't change the photos\. Try again\.$/,
      )
    })

    // Always offered while open (adding never switches the choice), with how
    // many OWN photos there are — 3 here, while the library shows 2: the
    // count must not be the number of photos on screen — and a way back here.
    it("links to this patient's photos, with how many there are", async () => {
      program = () =>
        answer(true, [
          ...OWN,
          { objectKey: 'patients/6/exercise-photos/c.png', url: 'https://storage.example/own-c.png' },
        ])
      renderAt(`${PAGE}?returnTo=%2Fpractitioner%2Fprograms%2Fassigned%2F12`)

      const link = await screen.findByRole('link', { name: "Manage this patient's photos (3)" })
      expect(link).toHaveAttribute(
        'href',
        `/practitioner/programs/assigned/12/exercises/101/photos?returnTo=${encodeURIComponent(
          `/practitioner/programs/assigned/12/exercises/101?returnTo=${encodeURIComponent('/practitioner/programs/assigned/12')}`,
        )}`,
      )
    })

    // Not the program's to change once closed: the photos and where they
    // come from, no choice, no link.
    it('shows them read-only on a closed program', async () => {
      program = () => answer(false, OWN, { status: 'cancelled' })
      renderAt(PAGE)

      expect(await screen.findByText('- View Exercise -')).toBeInTheDocument()
      expect(screen.getByAltText('Glute Bridge photo 1')).toBeInTheDocument()
      expect(screen.getByText(OWN_NOTE)).toBeInTheDocument()
      expect(screen.queryByRole('radio')).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Manage this patient's photos/ })).not.toBeInTheDocument()
    })
  })

  // Removed exercises are part of the record, never edited (decided
  // 2026-10-13) — even reached by an old link.
  it('says an exercise was removed, with no editors', async () => {
    renderAt('/practitioner/programs/assigned/12/exercises/102')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This exercise was removed from the program. It stays in the records of the sessions that used it.',
    )
    expect(screen.queryByRole('button', { name: /^Edit / })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the program' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12',
    )
  })

  it("says so when the id isn't one of the program's exercises", async () => {
    renderAt('/practitioner/programs/assigned/12/exercises/999')
    expect(await screen.findByRole('alert')).toHaveTextContent("This exercise isn't part of the program.")
  })

  it("says so when the program doesn't exist, or isn't the practitioner's to see", async () => {
    program = () => apiError(404, 'Assigned program not found')
    renderAt(PAGE)
    await expectProgramNotAvailable()
  })

  it('reports any other failure as a failure to load this exercise', async () => {
    program = () => apiError(500, 'Internal server error')
    renderAt(PAGE)
    await expectProgramLoadError('this exercise')
  })

  it('a "Try again" that works: the page, with focus on its heading', async () => {
    const user = userEvent.setup()
    program = () => apiError(500, 'Internal server error')
    renderAt(PAGE)
    await expectProgramLoadError('this exercise')
    program = () => json(PROGRAM)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    const heading = await screen.findByRole('heading', { level: 1, name: 'Knee Rehab — Pat' })
    await waitFor(() => expect(heading).toHaveFocus())
  })
})

describe('AssignedProgramExercisePage — the way back', () => {
  it('Done goes back to where the practitioner came from', async () => {
    renderAt(`${PAGE}?returnTo=${encodeURIComponent('/practitioner/programs/assigned/12?tab=x')}`)
    expect(await screen.findByRole('link', { name: 'Done' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12?tab=x',
    )
  })

  it("Done goes to the program's page when no returnTo is given", async () => {
    renderAt(PAGE)
    expect(await screen.findByRole('link', { name: 'Done' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12',
    )
  })

  // An open redirect closed: another site's address keeps only its path.
  it('never sends the practitioner to another site', async () => {
    renderAt(`${PAGE}?returnTo=${encodeURIComponent('https://elsewhere.example/login')}`)
    expect(await screen.findByRole('link', { name: 'Done' })).toHaveAttribute('href', '/login')
  })

  it('links to the exercise in the library, which comes back to this page', async () => {
    renderAt(`${PAGE}?returnTo=${encodeURIComponent('/practitioner/programs/assigned/12')}`)
    const link = await screen.findByRole('link', { name: 'Find it in Library' })
    const href = link.getAttribute('href') ?? ''
    expect(href.startsWith('/practitioner/library/5?returnTo=')).toBe(true)
    const back = new URL(href, 'http://x').searchParams.get('returnTo')
    expect(back).toBe(`${PAGE}?returnTo=${encodeURIComponent('/practitioner/programs/assigned/12')}`)
  })
})

describe('AssignedProgramExercisePage — changing the prescription', () => {
  // Literal bodies: what the backend receives, null included.
  it('saves a field to the program and shows the value the server answered', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Sets' }))
    await user.clear(screen.getByLabelText('Sets'))
    await user.type(screen.getByLabelText('Sets'), '4')
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    // The page reads the program's cache entry, which now holds the answer.
    expect(await screen.findByText('4')).toBeInTheDocument()
    expect(patches()).toStrictEqual([['PATCH', '/assigned-programs/12/exercises/101', '{"sets":4}']])
  })

  it('clears a field with an explicit null', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Reps' }))
    await user.clear(screen.getByLabelText('Reps'))
    await user.click(screen.getByRole('button', { name: 'Save Reps' }))

    await waitFor(() =>
      expect(patches()).toStrictEqual([['PATCH', '/assigned-programs/12/exercises/101', '{"reps":null}']]),
    )
  })

  it('saves the weight and its unit together', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Weight' }))
    await user.clear(screen.getByLabelText('Weight'))
    await user.type(screen.getByLabelText('Weight'), '25')
    await user.click(screen.getByRole('button', { name: 'lbs' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    await waitFor(() =>
      expect(patches()).toStrictEqual([
        ['PATCH', '/assigned-programs/12/exercises/101', '{"weight":25,"weightUnit":"lbs"}'],
      ]),
    )
  })

  it('saves the notes', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Notes' }))
    await user.clear(screen.getByLabelText('Notes'))
    await user.type(screen.getByLabelText('Notes'), 'Slow on the way down')
    await user.click(screen.getByRole('button', { name: 'Save Notes' }))

    expect(await screen.findByText('Slow on the way down')).toBeInTheDocument()
    expect(patches()).toStrictEqual([
      ['PATCH', '/assigned-programs/12/exercises/101', '{"notes":"Slow on the way down"}'],
    ])
  })

  it("shows the backend's refusal under the field, which stays open", async () => {
    patchAnswer = () => apiError(409, 'This program is completed: it can no longer change')
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Sets' }))
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    expect(
      await screen.findByText('This program is completed: it can no longer change'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Sets' })).toBeInTheDocument()
  })
})

// Step D-3: the program's own COPY of the description, edited for this
// patient — the same fields as the library's page, given this page's `save`.
describe('AssignedProgramExercisePage — changing the description', () => {
  it("renames this program's copy, and shows the name the server answered", async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit exercise name' }))
    await user.clear(screen.getByLabelText('Exercise name'))
    await user.type(screen.getByLabelText('Exercise name'), 'Single-leg Glute Bridge')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Single-leg Glute Bridge' }),
    ).toBeInTheDocument()
    expect(patches()).toStrictEqual([
      ['PATCH', '/assigned-programs/12/exercises/101', '{"name":"Single-leg Glute Bridge"}'],
    ])
  })

  // "None" is [] — the backend refuses null for these lists since D-1.
  it('empties an optional list with []', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Secondary Muscles' }))
    await user.click(screen.getByRole('button', { name: 'Delete Secondary Muscles 1' }))
    await user.click(screen.getByRole('button', { name: 'Save Secondary Muscles' }))

    // Equipment was already empty: two "None" now.
    await waitFor(() => expect(screen.getAllByText('None')).toHaveLength(2))
    expect(patches()).toStrictEqual([
      ['PATCH', '/assigned-programs/12/exercises/101', '{"secondaryMuscles":[]}'],
    ])
  })

  it('refuses emptying a required list, and sends nothing', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(screen.getByRole('button', { name: 'Delete Primary Muscles 1' }))
    await user.click(screen.getByRole('button', { name: 'Save Primary Muscles' }))

    expect(
      await screen.findByText('At least one primary muscle is required'),
    ).toBeInTheDocument()
    expect(patches()).toStrictEqual([])
  })

  // A copied library exercise may have long steps (up to 744 characters in
  // the imported library): the shared rules allow 1,000.
  it('rewrites a step as a numbered list item, trimmed, up to 1,000 characters', async () => {
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Instructions' }))
    const step = screen.getByLabelText('Instructions 2')
    await user.clear(step)
    await user.click(step)
    await user.paste(` ${'a'.repeat(1001)} `)
    await user.click(screen.getByRole('button', { name: 'Save Instructions' }))
    expect(await screen.findByText('Must be 1000 characters or fewer')).toBeInTheDocument()
    expect(patches()).toStrictEqual([])

    await user.clear(step)
    await user.click(step)
    await user.paste(' Lift your hips, then hold for 2 seconds ')
    await user.click(screen.getByRole('button', { name: 'Save Instructions' }))

    expect(await screen.findByText('Lift your hips, then hold for 2 seconds')).toBeInTheDocument()
    expect(patches()).toStrictEqual([
      [
        'PATCH',
        '/assigned-programs/12/exercises/101',
        '{"instructions":["Lie on your back","Lift your hips, then hold for 2 seconds"]}',
      ],
    ])
  })

  it("shows the backend's refusal under the field, which stays open", async () => {
    patchAnswer = () => apiError(400, "A primary muscle can't be blank")
    const user = renderAt(PAGE)
    await user.click(await screen.findByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(screen.getByRole('button', { name: 'Save Primary Muscles' }))

    expect(await screen.findByText("A primary muscle can't be blank")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Primary Muscles' })).toBeInTheDocument()
  })
})