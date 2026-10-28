import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import {
  errorResponse,
  expectLoadError,
  expectRecordNotFound,
  retryThenExpectFocusOn,
} from '@/common/loadFailureAssertions'
import { ExercisePhotosPage } from './ExercisePhotosPage'
import type { ExerciseDetail } from './types'
import { expectLoading } from '@/common/loadingAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/practitioner/library/:id/photos"
            element={<ExercisePhotosPage />}
          />
          <Route
            path="/practitioner/library/:id"
            element={<div>Exercise detail page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

function makeExercise(overrides: Partial<ExerciseDetail> = {}): ExerciseDetail {
  return {
    id: 42,
    externalId: null,
    name: 'Wall Slide',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
    equipment: [],
    instructions: ['Step'],
    images: [],
    source: 'custom',
    createdBy: 7,
    isArchived: false,
    author: null,
    ...overrides,
  }
}

function pngFile(name: string, sizeBytes = 100) {
  const file = new File([new Uint8Array(sizeBytes)], name, {
    type: 'image/png',
  })
  return file
}

describe('ExercisePhotosPage', () => {
  it('an id that is not a number: "Exercise not found", without ever fetching', async () => {
    renderAt('/practitioner/library/not-a-number/photos')
    await expectRecordNotFound('exercise', [['Exercise Library', '/practitioner/library']])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a 404: "Exercise not found", and no Try again', async () => {
    fetchMock.mockResolvedValue(errorResponse(404, ['Exercise 42 not found']))
    renderAt('/practitioner/library/42/photos')
    await expectRecordNotFound('exercise', [['Exercise Library', '/practitioner/library']])
  })

  it('shows a loading state before the exercise resolves', () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    renderAt('/practitioner/library/42/photos')
    expectLoading('Loading…')
  })

  it('any other failure: the load error with its reason; a retry that works focuses the heading', async () => {
    const user = userEvent.setup()
    fetchMock
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(jsonResponse(makeExercise()))
    renderAt('/practitioner/library/42/photos')
    await expectLoadError('this exercise')
    await retryThenExpectFocusOn(user, { level: 1, name: 'Manage Photos' })
  })

  it("shows the exercise's name and a 'no photos yet' message when its gallery is empty", async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeExercise()))
    renderAt('/practitioner/library/42/photos')
    expect(await screen.findByText('Wall Slide')).toBeInTheDocument()
    expect(screen.getByText('No photos yet.')).toBeInTheDocument()
  })

  it('renders each existing photo with its real url and a numbered alt text', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        makeExercise({
          images: [
            { objectKey: 'a.jpg', url: 'https://signed.example/a.jpg' },
            { objectKey: 'b.jpg', url: 'https://signed.example/b.jpg' },
          ],
        }),
      ),
    )
    renderAt('/practitioner/library/42/photos')

    const firstImage = await screen.findByAltText('Wall Slide photo 1')
    expect(firstImage).toHaveAttribute('src', 'https://signed.example/a.jpg')
    const secondImage = screen.getByAltText('Wall Slide photo 2')
    expect(secondImage).toHaveAttribute('src', 'https://signed.example/b.jpg')
  })

  it('rejects more than 5 files at once without ever calling the API', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeExercise()))
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/photos')
    await screen.findByText('Wall Slide')
    fetchMock.mockClear() // clear the initial GET before checking upload behavior

    const files = Array.from({ length: 6 }, (_, i) => pngFile(`p${i}.png`))
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    await user.upload(input, files)

    expect(
      await screen.findByText('You can upload up to 5 images at a time'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a disallowed file type dropped onto the drop zone, without ever calling the API', async () => {
    // Deliberately uses a DROP event, not the file picker input — accept
    // only restricts what the OS's file-picker DIALOG offers to choose
    // from; it does nothing to prevent a drag-and-drop drop of any file
    // type at all. That makes this the realistic path where the app's
    // OWN validation (validateExerciseImageFiles) is the only thing
    // standing between a bad file and an upload attempt, not just a
    // workaround for the picker input's accept attribute getting in the
    // way of the test.
    fetchMock.mockResolvedValue(jsonResponse(makeExercise()))
    renderAt('/practitioner/library/42/photos')
    await screen.findByText('Wall Slide')
    fetchMock.mockClear()

    const badFile = new File([new Uint8Array(10)], 'notes.txt', {
      type: 'text/plain',
    })
    const dropZone = screen.getByText('Drag photos here, or').closest('div')!
    fireEvent.drop(dropZone, { dataTransfer: { files: [badFile] } })

    expect(
      await screen.findByText('Only JPEG, PNG, and WebP images are allowed'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads a valid file dropped onto the drop zone', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeExercise()))
    renderAt('/practitioner/library/42/photos')
    await screen.findByText('Wall Slide')

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        makeExercise({
          images: [
            { objectKey: 'dropped.jpg', url: 'https://signed.example/dropped.jpg' },
          ],
        }),
      ),
    )

    const file = pngFile('dropped.png')
    const dropZone = screen.getByText('Drag photos here, or').closest('div')!
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByAltText('Wall Slide photo 1'),
    ).toBeInTheDocument()
  })

  it('uploads valid files as multipart form data under the "files" field', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeExercise()))
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/photos')
    await screen.findByText('Wall Slide')

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        makeExercise({
          images: [{ objectKey: 'new.jpg', url: 'https://signed.example/new.jpg' }],
        }),
      ),
    )

    const file = pngFile('photo.png')
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const uploadCall = fetchMock.mock.calls[1]
    expect(uploadCall[0]).toContain('/exercises/42/images')
    const options = uploadCall[1] as RequestInit
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.body as FormData).getAll('files')).toEqual([file])

    // The response is written straight into the cache — the new photo
    // should now be visible without any extra fetch.
    expect(await screen.findByAltText('Wall Slide photo 1')).toBeInTheDocument()
  })

  it('shows the API error message when upload fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(makeExercise()))
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/photos')
    await screen.findByText('Wall Slide')

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 400, message: ['Storage is full'] }, 400),
    )

    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement
    await user.upload(input, pngFile('photo.png'))

    expect(await screen.findByText('Storage is full')).toBeInTheDocument()
  })

  it('removes a photo when its delete button is clicked, updating the gallery', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        makeExercise({
          images: [
            { objectKey: 'a.jpg', url: 'https://signed.example/a.jpg' },
            { objectKey: 'b.jpg', url: 'https://signed.example/b.jpg' },
          ],
        }),
      ),
    )
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/photos')
    await screen.findByAltText('Wall Slide photo 1')

    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        makeExercise({
          images: [{ objectKey: 'b.jpg', url: 'https://signed.example/b.jpg' }],
        }),
      ),
    )

    await user.click(
      screen.getAllByRole('button', { name: 'Remove this photo' })[0],
    )

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/exercises/42/images'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ objectKey: 'a.jpg' }),
        }),
      ),
    )
    // Gallery reflects the server's new state — only one photo left,
    // and it's the one that was NOT deleted.
    await waitFor(() =>
      expect(
        screen.queryByAltText('Wall Slide photo 2'),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByAltText('Wall Slide photo 1')).toHaveAttribute(
      'src',
      'https://signed.example/b.jpg',
    )
  })

  it('shows an error message when removing a photo fails', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        makeExercise({
          images: [{ objectKey: 'a.jpg', url: 'https://signed.example/a.jpg' }],
        }),
      ),
    )
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/photos')
    await screen.findByAltText('Wall Slide photo 1')

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500),
    )
    await user.click(screen.getByRole('button', { name: 'Remove this photo' }))

    expect(
      await screen.findByText("Couldn't remove that photo. Try again."),
    ).toBeInTheDocument()
  })

  it('the Done button navigates to the exercise detail page', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeExercise()))
    const user = userEvent.setup()
    renderAt('/practitioner/library/42/photos')
    await screen.findByText('Wall Slide')

    await user.click(screen.getByRole('link', { name: 'Done' }))
    expect(
      await screen.findByText('Exercise detail page'),
    ).toBeInTheDocument()
  })
})