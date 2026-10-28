import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ProgramExercisePhotosPage } from './ProgramExercisePhotosPage'
import { expectProgramLoadError, expectProgramNotAvailable } from './programNotAvailableAssertions'
import type { AssignedProgramDetail, AssignedProgramExercise } from './types'
import type { ExerciseImage } from '@/exercises/types'

// A program exercise's OWN photos (program-specific photos, 2026-10-17): what
// the page shows (whether the patient sees them, the count, the photos), what
// each action sends (literal requests), the checks made BEFORE a request (no
// room, the library's file rules), the copy button's reasons, the backend's
// refusals, a closed program, a removed exercise. Reordering's cache logic is
// tested on the hook (useOwnPhotoEditing.test.tsx); the drag itself needs a
// real browser to measure layout (checked in Chromium).

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}
function apiError(statusCode: number, message: string) {
  return json({ statusCode, message: [message], error: 'Error' }, statusCode)
}

const own = (count: number): ExerciseImage[] =>
  Array.from({ length: count }, (_, i) => ({
    objectKey: `patients/6/exercise-photos/p${i}.png`,
    url: `https://storage.example/p${i}.png`,
  }))

function bridge(fields: Partial<AssignedProgramExercise> = {}): AssignedProgramExercise {
  const ownImages = fields.ownImages ?? own(2)
  const useLibraryImages = fields.useLibraryImages ?? true
  return {
    id: 101,
    assignedProgramId: 12,
    workoutId: 57,
    exerciseId: 5,
    name: 'Glute Bridge',
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    equipment: [],
    instructions: ['Lift your hips'],
    sets: 3,
    reps: 10,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    sortOrder: 0,
    notes: null,
    retiredAt: null,
    retiredBy: null,
    images: useLibraryImages
      ? [{ url: 'https://storage.example/library-0.jpg' }]
      : ownImages.map(({ url }) => ({ url })),
    useLibraryImages,
    ownImages,
    ...fields,
  }
}

function programWith(exercise: AssignedProgramExercise, change: Partial<AssignedProgramDetail> = {}) {
  return {
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
    exercises: [exercise],
    retiredExercises: [],
    ...change,
  } satisfies AssignedProgramDetail
}

// The library exercise 5, as GET /exercises/5 answers (only its photos matter).
function libraryExercise(count: number) {
  return {
    id: 5,
    name: 'Glute Bridge',
    images: Array.from({ length: count }, (_, i) => ({
      objectKey: `exercises/5/${i}.jpg`,
      url: `https://storage.example/library-${i}.jpg`,
    })),
  }
}

const PHOTOS = '/assigned-programs/12/exercises/101/images'
let requests: { method: string; path: string; body: unknown }[]
let program: () => Response
let library: () => Response
// What the photo routes answer, by method and path.
let answers: Record<string, () => Response | Promise<Response>>

// GET /users/6 — the program's patient: only `isActive` matters here
// (decisions §22 — a deactivated patient's program can't change).
let patientActive: boolean
const patientAnswer = () =>
  json({ id: 6, firstName: 'Pat', lastName: 'Lee', roles: ['patient'], isActive: patientActive })

beforeEach(() => {
  fetchMock.mockReset()
  requests = []
  patientActive = true
  program = () => json(programWith(bridge()))
  library = () => json(libraryExercise(2))
  answers = {}
  fetchMock.mockImplementation((input, init) => {
    const path = new URL(input as string, 'http://x').pathname
    const method = init?.method ?? 'GET'
    requests.push({ method, path, body: init?.body })
    if (method === 'GET' && path === '/assigned-programs/12') return Promise.resolve(program())
    if (method === 'GET' && path === '/users/6') return Promise.resolve(patientAnswer())
    if (method === 'GET' && path === '/exercises/5') return Promise.resolve(library())
    const answer = answers[`${method} ${path}`]
    if (answer) return Promise.resolve(answer())
    return Promise.reject(new Error(`Unhandled fetch in test: ${method} ${path}`))
  })
})

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/programs/assigned/:id/exercises/:rowId/photos"
            element={<ProgramExercisePhotosPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

const PAGE = '/practitioner/programs/assigned/12/exercises/101/photos'
const writes = () => requests.filter(({ method }) => method !== 'GET')
const png = (name: string) => new File([new Uint8Array(100)], name, { type: 'image/png' })
const NOT_SHOWN =
  'Not shown to the patient yet: they see the library\'s photos. To show these, choose "This patient\'s own photos" on the exercise page.'
const SHOWN = 'The patient sees these photos, in this order.'

describe('ProgramExercisePhotosPage — reading', () => {
  it.each([
    ['/practitioner/programs/assigned/abc/exercises/101/photos'],
    ['/practitioner/programs/assigned/12/exercises/0/photos'],
  ])('says an address that names no exercise is not available — asking nothing (%s)', async (path) => {
    renderAt(path)
    await expectProgramNotAvailable()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the own photos, how many of 10, and that the patient does NOT see them yet', async () => {
    renderAt(PAGE)

    expect(await screen.findByRole('heading', { level: 1, name: "This patient's photos" })).toBeInTheDocument()
    expect(screen.getByText('Glute Bridge · Knee Rehab — Pat')).toBeInTheDocument()
    expect(screen.getByText('2 of 10 photos')).toBeInTheDocument()
    expect(screen.getByText(NOT_SHOWN)).toBeInTheDocument()
    expect(screen.queryByText(SHOWN)).not.toBeInTheDocument()
    expect(screen.getByAltText('Glute Bridge photo 1')).toHaveAttribute('src', 'https://storage.example/p0.png')
    expect(screen.getByAltText('Glute Bridge photo 2')).toHaveAttribute('src', 'https://storage.example/p1.png')
    expect(screen.getByText('The first photo is the cover. Removing a photo deletes it for good.')).toBeInTheDocument()
  })

  it('says the patient sees them when they are chosen', async () => {
    program = () => json(programWith(bridge({ useLibraryImages: false })))
    renderAt(PAGE)

    expect(await screen.findByText(SHOWN)).toBeInTheDocument()
    expect(screen.queryByText(NOT_SHOWN)).not.toBeInTheDocument()
  })

  it('says there are none yet', async () => {
    program = () => json(programWith(bridge({ ownImages: [] })))
    renderAt(PAGE)

    expect(await screen.findByText('No photos for this patient yet.')).toBeInTheDocument()
    expect(screen.getByText('0 of 10 photos')).toBeInTheDocument()
    expect(screen.queryByAltText('Glute Bridge photo 1')).not.toBeInTheDocument()
  })

  it('goes back where it came from, kept on this site', async () => {
    renderAt(`${PAGE}?returnTo=${encodeURIComponent('https://elsewhere.example/x')}`)
    // localPath keeps only the path of an absolute address.
    expect(await screen.findByRole('link', { name: 'Done' })).toHaveAttribute('href', '/x')
  })

  it('goes back to the exercise page by default', async () => {
    renderAt(PAGE)
    expect(await screen.findByRole('link', { name: 'Done' })).toHaveAttribute(
      'href',
      '/practitioner/programs/assigned/12/exercises/101',
    )
  })

  it.each([
    ['completed', { status: 'completed' }],
    ['cancelled', { status: 'cancelled' }],
    ['deleted', { isArchived: true }],
  ])('is read-only on a %s program', async (_label, change) => {
    program = () => json(programWith(bridge(), change as Partial<AssignedProgramDetail>))
    renderAt(PAGE)

    expect(await screen.findByText('This program is closed: its photos can no longer change.')).toBeInTheDocument()
    expect(screen.getByAltText('Glute Bridge photo 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Browse files|Add the library's photos|Remove this photo/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Photos to upload')).not.toBeInTheDocument()
  })

  it("is read-only on a deactivated patient's open program, saying why", async () => {
    patientActive = false
    renderAt(PAGE)

    expect(
      await screen.findByText(
        "This patient's account is deactivated: these photos can't change until an admin reactivates it.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByAltText('Glute Bridge photo 1')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Browse files|Add the library's photos|Remove this photo/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Photos to upload')).not.toBeInTheDocument()
  })

  it('says an exercise was removed from the program', async () => {
    program = () =>
      json(programWith(bridge({ id: 999 }), { retiredExercises: [bridge({ retiredAt: '2031-06-10T09:00:00Z', retiredBy: 3 })], exercises: [] }))
    renderAt(PAGE)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This exercise was removed from the program: its photos can no longer change.',
    )
  })

  it("says so when the id isn't one of the program's exercises", async () => {
    program = () => json(programWith(bridge({ id: 102 })))
    renderAt(PAGE)
    expect(await screen.findByRole('alert')).toHaveTextContent("This exercise isn't part of the program.")
  })

  it("says so when the program doesn't exist, or isn't one the practitioner can see", async () => {
    program = () => apiError(404, 'Assigned program 12 not found')
    renderAt(PAGE)
    await expectProgramNotAvailable()
  })

  it('reports any other failure as a failure to load these photos', async () => {
    program = () => apiError(500, 'Internal server error')
    renderAt(PAGE)
    await expectProgramLoadError('these photos')
  })

  it('a "Try again" that works: the page, with focus on its heading', async () => {
    const user = userEvent.setup()
    program = () => apiError(500, 'Internal server error')
    renderAt(PAGE)
    await expectProgramLoadError('these photos')
    program = () => json(programWith(bridge()))
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    const heading = await screen.findByRole('heading', { level: 1, name: "This patient's photos" })
    await waitFor(() => expect(heading).toHaveFocus())
  })
})

describe('ProgramExercisePhotosPage — uploading', () => {
  it('uploads the chosen files as multipart, then shows the answer', async () => {
    answers[`POST ${PHOTOS}`] = () => json(programWith(bridge({ ownImages: own(3) })))
    const user = renderAt(PAGE)
    await screen.findByText('2 of 10 photos')

    const file = png('chair.png')
    await user.upload(screen.getByLabelText('Photos to upload'), file)

    expect(await screen.findByText('3 of 10 photos')).toBeInTheDocument()
    expect(screen.getByAltText('Glute Bridge photo 3')).toBeInTheDocument()
    const [upload] = writes()
    expect(upload.method).toBe('POST')
    expect(upload.path).toBe(PHOTOS)
    expect((upload.body as FormData).getAll('files')).toEqual([file])
  })

  it('refuses files past the limit before any request, saying how many fit', async () => {
    program = () => json(programWith(bridge({ ownImages: own(8) })))
    const user = renderAt(PAGE)
    await screen.findByText('8 of 10 photos')

    await user.upload(screen.getByLabelText('Photos to upload'), [png('a.png'), png('b.png'), png('c.png')])

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "There's room for 2 more photos (10 at most): choose fewer.",
    )
    expect(writes()).toEqual([])
  })

  it("applies the library's file rules to a dropped file", async () => {
    renderAt(PAGE)
    await screen.findByText('2 of 10 photos')

    const dropZone = screen.getByText('Drag photos here, or').closest('div')!
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('Only JPEG, PNG, and WebP images are allowed')
    expect(writes()).toEqual([])
  })

  it('offers no upload when there is no room left', async () => {
    program = () => json(programWith(bridge({ ownImages: own(10) })))
    renderAt(PAGE)

    expect(await screen.findByText('No room for more photos: remove one to add another.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Browse files' })).not.toBeInTheDocument()
    expect(screen.queryByText('Drag photos here, or')).not.toBeInTheDocument()
  })

  it("shows the backend's reason when it refuses, and the next action clears it", async () => {
    answers[`POST ${PHOTOS}`] = () =>
      apiError(409, 'A program exercise can have at most 10 photos: this one has 10, so no more can be added')
    const user = renderAt(PAGE)
    await screen.findByText('2 of 10 photos')

    await user.upload(screen.getByLabelText('Photos to upload'), png('a.png'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't upload the photos. A program exercise can have at most 10 photos: this one has 10, so no more can be added",
    )

    answers[`POST ${PHOTOS}`] = () => json(programWith(bridge({ ownImages: own(3) })))
    await user.upload(screen.getByLabelText('Photos to upload'), png('b.png'))
    await screen.findByText('3 of 10 photos')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it("hides a server failure's details", async () => {
    answers[`POST ${PHOTOS}`] = () => apiError(500, 'Internal server error')
    const user = renderAt(PAGE)
    await screen.findByText('2 of 10 photos')

    await user.upload(screen.getByLabelText('Photos to upload'), png('a.png'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't upload the photos. Something went wrong on our side. Try again in a moment.",
    )
  })

  // No answer at all: what failed, then "Try again." — nothing came back.
  it('says what failed, and to try again, when no answer comes', async () => {
    answers[`POST ${PHOTOS}`] = () => Promise.reject(new TypeError('Failed to fetch'))
    const user = renderAt(PAGE)
    await screen.findByText('2 of 10 photos')

    await user.upload(screen.getByLabelText('Photos to upload'), png('a.png'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Couldn't upload the photos\. Try again\.$/,
    )
  })
})

describe("ProgramExercisePhotosPage — the library's photos", () => {
  it('names how many the library has, and copies them', async () => {
    answers[`POST ${PHOTOS}/from-library`] = () => json(programWith(bridge({ ownImages: own(4) })))
    const user = renderAt(PAGE)

    await user.click(await screen.findByRole('button', { name: "Add the library's photos (2)" }))

    expect(await screen.findByText('4 of 10 photos')).toBeInTheDocument()
    expect(writes()).toEqual([{ method: 'POST', path: `${PHOTOS}/from-library`, body: undefined }])
  })

  // Always offered (decided 2026-10-17), but disabled with its reason when it
  // can't work.
  it.each([
    [0, 2, 'This exercise has no photos in the library.'],
    [3, 8, "The library has 3 photos, but there's room for 2 more photos (10 at most)."],
  ])('is disabled with its reason (library %i, own %i)', async (libraryCount, ownCount, reason) => {
    library = () => json(libraryExercise(libraryCount))
    program = () => json(programWith(bridge({ ownImages: own(ownCount) })))
    renderAt(PAGE)

    const button = await screen.findByRole('button', { name: `Add the library's photos (${libraryCount})` })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription(reason)
  })

  it('waits for the library before offering it', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    library = () => json(libraryExercise(2))
    fetchMock.mockImplementation((input, init) => {
      const path = new URL(input as string, 'http://x').pathname
      if (path === '/exercises/5') return held.then(() => library())
      requests.push({ method: init?.method ?? 'GET', path, body: init?.body })
      return Promise.resolve(program())
    })
    renderAt(PAGE)

    expect(await screen.findByRole('button', { name: "Add the library's photos" })).toBeDisabled()
    release()
    expect(await screen.findByRole('button', { name: "Add the library's photos (2)" })).toBeEnabled()
  })

  it("shows the backend's reason when the copy is refused", async () => {
    answers[`POST ${PHOTOS}/from-library`] = () =>
      apiError(409, 'This exercise has no photos in the library to copy')
    const user = renderAt(PAGE)

    await user.click(await screen.findByRole('button', { name: "Add the library's photos (2)" }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't copy the library's photos. This exercise has no photos in the library to copy",
    )
  })
})

describe('ProgramExercisePhotosPage — removing', () => {
  // The SECOND photo: the request must name the photo clicked, not another.
  it('removes one photo by its key, then shows the answer', async () => {
    answers[`DELETE ${PHOTOS}`] = () => json(programWith(bridge({ ownImages: [own(2)[0]] })))
    const user = renderAt(PAGE)

    const second = (await screen.findByAltText('Glute Bridge photo 2')).parentElement!
    await user.click(within(second).getByRole('button', { name: 'Remove this photo' }))

    expect(await screen.findByText('1 of 10 photos')).toBeInTheDocument()
    expect(writes()).toEqual([
      { method: 'DELETE', path: PHOTOS, body: '{"objectKey":"patients/6/exercise-photos/p1.png"}' },
    ])
  })

  // While one change is on its way, nothing else that changes the photos.
  it('disables the other actions while a change is on its way', async () => {
    let release!: () => void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    answers[`DELETE ${PHOTOS}`] = () => json(programWith(bridge({ ownImages: [own(2)[1]] })))
    fetchMock.mockImplementation((input, init) => {
      const path = new URL(input as string, 'http://x').pathname
      const method = init?.method ?? 'GET'
      requests.push({ method, path, body: init?.body })
      if (method === 'GET' && path === '/exercises/5') return Promise.resolve(library())
      if (method === 'GET') return Promise.resolve(program())
      return held.then(() => answers[`${method} ${path}`]())
    })
    const user = renderAt(PAGE)

    const [firstRemove] = await screen.findAllByRole('button', { name: 'Remove this photo' })
    await screen.findByRole('button', { name: "Add the library's photos (2)" })
    await user.click(firstRemove)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: "Add the library's photos (2)" })).toBeDisabled(),
    )
    expect(screen.getByRole('button', { name: 'Browse files' })).toBeDisabled()
    for (const button of screen.getAllByRole('button', { name: 'Remove this photo' })) {
      expect(button).toBeDisabled()
    }
    // The drop zone has no button to disable: a file dropped now is ignored.
    const dropZone = screen.getByText('Drag photos here, or').closest('div')!
    fireEvent.drop(dropZone, { dataTransfer: { files: [png('late.png')] } })
    release()
    expect(await screen.findByText('1 of 10 photos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Browse files' })).toBeEnabled()
    // Checked once everything has settled: a request starts a tick after the
    // action that asks for it.
    expect(writes().map(({ method }) => method)).toEqual(['DELETE'])
  })

  it("shows the backend's reason when a removal is refused", async () => {
    answers[`DELETE ${PHOTOS}`] = () => apiError(404, "This photo is not one of this exercise's own photos")
    const user = renderAt(PAGE)

    const [firstRemove] = await screen.findAllByRole('button', { name: 'Remove this photo' })
    await user.click(firstRemove)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't remove the photo. This photo is not one of this exercise's own photos",
    )
  })
})