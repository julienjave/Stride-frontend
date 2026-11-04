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
import { AvatarUpload } from './AvatarUpload'
import { useUser } from './useUser'
import { userQueryKey, usersListQueryKey } from './api'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { cropToAvatarFile } from './cropImage'
import { FAKE_CROP_AREA } from './fakeCropArea'
import type { User } from './types'

// jsdom can't run the real cropper (see FakeCropper.tsx), and has no
// canvas for the real cropToAvatarFile — which is checked in a real
// browser instead. Here it's a vi.fn() whose result each test controls.
vi.mock('react-easy-crop', () => import('./FakeCropper'))
vi.mock('./cropImage', () => ({ cropToAvatarFile: vi.fn() }))
const cropToAvatarFileMock = vi.mocked(cropToAvatarFile)

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// What the (fake) crop step produces: a different File from the one
// picked, so a test can tell which of the two got uploaded.
const CROPPED_FILE = new File([new Uint8Array(100)], 'avatar.jpg', { type: 'image/jpeg' })

// test-setup.ts replaces both URL functions with vi.fn()s (jsdom has
// neither). spyOn gives a handle to each that can be asserted on and reset
// between tests — referencing `URL.revokeObjectURL` directly in expect()
// trips the unbound-method lint rule.
const createObjectURL = vi.spyOn(URL, 'createObjectURL')
const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')

beforeEach(() => {
  fetchMock.mockReset()
  revokeObjectURL.mockClear()
  cropToAvatarFileMock.mockReset()
  cropToAvatarFileMock.mockResolvedValue(CROPPED_FILE)
  // Two DIFFERENT local URLs: one for the picked original (shown in the
  // crop dialog), one for the cropped result (the preview). With a single
  // shared fake URL, a test couldn't tell which one is displayed or
  // released.
  createObjectURL.mockImplementation((object) =>
    object === CROPPED_FILE ? 'blob:cropped' : 'blob:original',
  )
})

// fetch() accepts a string, a URL or a Request — normalized to a string.
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

const OLD_URL = 'https://storage.example.com/signed/avatars/5/old.png'
const NEW_URL = 'https://storage.example.com/signed/avatars/5/new.png'

// Only the fields the component and the cache code read — cast, since a
// full User would be noise here.
function makeUser(avatarUrl: string | null) {
  return { id: 5, firstName: 'Jamie', lastName: 'Rivera', avatarUrl } as User
}

// Renders AvatarUpload the way the real pages do: `user` comes from
// useUser(), i.e. from the cache. That's what lets a test check what the
// page DISPLAYS after an upload writes the response into the cache — not
// just that the cache changed.
function Harness({ userId }: { userId: number }) {
  const { data: user } = useUser(userId)
  return user ? <AvatarUpload user={user} /> : null
}

function renderUpload(avatarUrl: string | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      // staleTime: Infinity — the seeded user counts as fresh, so useUser
      // doesn't fire its own GET (which would eat a mocked response).
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  queryClient.setQueryData(userQueryKey(5), makeUser(avatarUrl))
  render(
    <QueryClientProvider client={queryClient}>
      <Harness userId={5} />
    </QueryClientProvider>,
  )
  return queryClient
}

function makeFile(name: string, type: string, sizeBytes: number) {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

function fileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement
}

// The avatar <img> (aria-hidden, so looked up in the DOM), or null when
// initials are showing. Looked up inside the "Photo" region, so the crop
// dialog's own <img> (rendered elsewhere in the page) can't be mistaken
// for it.
//
// hidden: true — while a MODAL dialog is open, Radix marks everything else
// on the page aria-hidden (so a screen reader stays inside the dialog), and
// getByRole skips aria-hidden content by default. The region is still
// there and still visible behind the dialog; this includes it anyway.
function displayedPhoto() {
  return screen.getByRole('region', { name: 'Photo', hidden: true }).querySelector('img')
}

// The whole happy path through the UI: pick a file, let the (fake)
// cropper report its area, click Save.
async function pickAndCrop(user: ReturnType<typeof userEvent.setup>, file: File) {
  await user.upload(fileInput(), file)
  await user.click(await screen.findByRole('button', { name: 'Simulate photo loaded' }))
  await user.click(screen.getByRole('button', { name: 'Save photo' }))
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

describe('AvatarUpload — what it shows', () => {
  it('with no photo: initials, "Upload photo", and no Remove button', () => {
    renderUpload(null)
    expect(screen.getByText('JR')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
  })

  it('with a photo: the photo, "Change photo" and "Remove photo"', () => {
    renderUpload(OLD_URL)
    expect(displayedPhoto()).toHaveAttribute('src', OLD_URL)
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeInTheDocument()
  })

  it('is a labelled "Photo" region', () => {
    renderUpload(null)
    expect(screen.getByRole('region', { name: 'Photo' })).toBeInTheDocument()
  })
})

describe('AvatarUpload — checking the file before uploading', () => {
  it('refuses a file type the backend would refuse, without calling the API', async () => {
    // applyAccept: false — otherwise userEvent mimics the OS picker's
    // `accept` filter and the PDF never reaches our code at all, so the
    // test would pass without our own check running (see the same note
    // in ClinicLogoUpload.test.tsx).
    const user = userEvent.setup({ applyAccept: false })
    renderUpload()

    await user.upload(fileInput(), makeFile('cv.pdf', 'application/pdf', 1000))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only JPEG, PNG, and WebP images are allowed',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a photo over 20MB, without opening the crop dialog', async () => {
    const user = userEvent.setup()
    renderUpload()

    await user.upload(fileInput(), makeFile('huge.png', 'image/png', 20 * 1024 * 1024 + 1))

    expect(await screen.findByRole('alert')).toHaveTextContent('Image must be 20MB or smaller')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts a photo of exactly 20MB', async () => {
    const user = userEvent.setup()
    renderUpload()

    await user.upload(fileInput(), makeFile('max.jpg', 'image/jpeg', 20 * 1024 * 1024))

    expect(await screen.findByRole('dialog', { name: 'Crop your photo' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('accepts a phone photo over the backend’s 5MB — only the small cropped JPEG is uploaded', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderUpload()

    await pickAndCrop(user, makeFile('IMG_0042.jpg', 'image/jpeg', 12 * 1024 * 1024))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = fetchMock.mock.calls[0][1]?.body as FormData
    expect(body.get('file')).toBe(CROPPED_FILE)
  })
})

describe('AvatarUpload — the crop step', () => {
  it('opens the crop dialog on the picked photo, and uploads nothing yet', async () => {
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.upload(fileInput(), makeFile('me.png', 'image/png', 1000))

    const dialog = await screen.findByRole('dialog', { name: 'Crop your photo' })
    expect(dialog.querySelector('img')).toHaveAttribute('src', 'blob:original')
    expect(cropToAvatarFileMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    // The avatar still shows what's saved until Save.
    expect(displayedPhoto()).toHaveAttribute('src', OLD_URL)
  })

  it('Cancel: closes the dialog, uploads nothing, releases the photo, keeps the avatar', async () => {
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.upload(fileInput(), makeFile('me.png', 'image/png', 1000))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(cropToAvatarFileMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:original')
    expect(displayedPhoto()).toHaveAttribute('src', OLD_URL)
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeEnabled()
  })

  it('crops the picked photo with the area chosen in the dialog, and closes it', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderUpload(null)

    await pickAndCrop(user, makeFile('me.png', 'image/png', 1000))

    expect(cropToAvatarFileMock).toHaveBeenCalledTimes(1)
    expect(cropToAvatarFileMock).toHaveBeenCalledWith('blob:original', FAKE_CROP_AREA)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('if cropping fails: an error, no upload, and nothing left in memory', async () => {
    cropToAvatarFileMock.mockRejectedValue(new Error("Couldn't encode the image"))
    const user = userEvent.setup()
    renderUpload(null)

    await pickAndCrop(user, makeFile('me.png', 'image/png', 1000))

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't upload the photo.")
    expect(fetchMock).not.toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:original')
    expect(displayedPhoto()).toBeNull()
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeEnabled()
  })
})

describe('AvatarUpload — uploading', () => {
  it('shows the CROPPED image straight away, and disables both buttons while it uploads', async () => {
    // Never resolves: freezes the "in flight" moment for inspection.
    fetchMock.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await pickAndCrop(user, makeFile('me.png', 'image/png', 1000))

    // The preview is what will be saved — not the original photo.
    await waitFor(() => expect(displayedPhoto()).toHaveAttribute('src', 'blob:cropped'))
    expect(await screen.findByRole('button', { name: 'Uploading…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeDisabled()
  })

  it('POSTs the cropped file as multipart form data, then shows the saved photo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeUser(NEW_URL)))
    const user = userEvent.setup()
    renderUpload(null)

    await pickAndCrop(user, makeFile('me.png', 'image/png', 1000))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(urlOf(url)).toMatch(/\/users\/5\/avatar$/)
    expect(init?.method).toBe('POST')
    // A FormData body under the field name "file" — what the backend's
    // FileInterceptor('file') reads. JSON here would never parse. And the
    // file is the CROPPED one: the original never leaves the browser.
    const body = init?.body
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(CROPPED_FILE)
    // No hand-written Content-Type: the browser must add its own, with the
    // multipart boundary in it.
    expect(init?.headers).toEqual({})

    // What the person sees: the SAVED photo (from the response, through
    // the cache), not the local preview any more. Both local URLs have
    // been released.
    await waitFor(() => expect(displayedPhoto()).toHaveAttribute('src', NEW_URL))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cropped')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:original')
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeEnabled()
  })

  it('updates the logged-in user too, keeping their active role, and marks user lists stale', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeUser(NEW_URL)))
    const user = userEvent.setup()
    const queryClient = renderUpload(null)
    // This user is the one logged in: the header reads this entry.
    queryClient.setQueryData(currentUserQueryKey, {
      ...makeUser(null),
      activeRole: 'practitioner',
    })
    queryClient.setQueryData(usersListQueryKey(), [makeUser(null)])

    await pickAndCrop(user, makeFile('me.png', 'image/png', 1000))

    await waitFor(() =>
      expect(queryClient.getQueryData(currentUserQueryKey)).toEqual({
        ...makeUser(NEW_URL),
        activeRole: 'practitioner',
      }),
    )
    expect(queryClient.getQueryState(usersListQueryKey())?.isInvalidated).toBe(true)
  })

  it("leaves someone else's header alone (an admin changing another user's photo)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeUser(NEW_URL)))
    const user = userEvent.setup()
    const queryClient = renderUpload(null)
    const admin = { id: 1, firstName: 'Ada', lastName: 'Min', avatarUrl: null, activeRole: 'admin' }
    queryClient.setQueryData(currentUserQueryKey, admin)

    await pickAndCrop(user, makeFile('p.png', 'image/png', 1000))

    await waitFor(() => expect(displayedPhoto()).toHaveAttribute('src', NEW_URL))
    expect(queryClient.getQueryData(currentUserQueryKey)).toEqual(admin)
  })

  it('on failure: shows the backend message and drops the preview, since nothing was saved', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 400, message: ['Only JPEG, PNG, and WebP images are allowed'] }, 400),
    )
    const user = userEvent.setup()
    renderUpload(null)

    await pickAndCrop(user, makeFile('me.png', 'image/png', 1000))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only JPEG, PNG, and WebP images are allowed',
    )
    // Back to what's really stored: no photo, so initials.
    expect(displayedPhoto()).toBeNull()
    expect(screen.getByText('JR')).toBeInTheDocument()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cropped')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:original')
  })
})

describe('AvatarUpload — removing', () => {
  it('DELETEs the photo, then shows initials and no Remove button', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeUser(null)))
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(urlOf(url)).toMatch(/\/users\/5\/avatar$/)
    expect(init?.method).toBe('DELETE')

    await waitFor(() => expect(displayedPhoto()).toBeNull())
    expect(screen.getByText('JR')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeInTheDocument()
  })

  it('disables both buttons while the removal is in flight', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))

    expect(await screen.findByRole('button', { name: 'Removing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeDisabled()
  })

  it('shows the backend message when removal fails, and keeps the photo', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 403, message: ['You can only remove your own avatar'] }, 403),
    )
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You can only remove your own avatar',
    )
    expect(displayedPhoto()).toHaveAttribute('src', OLD_URL)
  })

  it("clears a previous upload's error message when a removal starts", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ statusCode: 400, message: ['Upload refused'] }, 400))
      .mockResolvedValueOnce(jsonResponse(makeUser(null)))
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await pickAndCrop(user, makeFile('me.png', 'image/png', 1000))
    expect(await screen.findByText('Upload refused')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))

    await waitFor(() => expect(screen.queryByText('Upload refused')).not.toBeInTheDocument())
  })
})

describe('AvatarUpload — a removal that gets no answer', () => {
  // No answer at all: the component says which action failed.
  it('says the photo could not be removed', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't remove the photo\.$/)
  })
})

describe('AvatarUpload — a new attempt replaces old messages', () => {
  it("clears a previous removal's error message when a new file is picked", async () => {
    // Only one response: picking a file no longer uploads anything by
    // itself (the crop dialog opens first).
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 400, message: ['Removal refused'] }, 400),
    )
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(await screen.findByText('Removal refused')).toBeInTheDocument()

    await user.upload(fileInput(), makeFile('me.png', 'image/png', 1000))

    expect(screen.queryByText('Removal refused')).not.toBeInTheDocument()
  })

  it("clears a previous upload's error message as soon as a new file is picked", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ statusCode: 400, message: ['Upload refused'] }, 400))
    const user = userEvent.setup()
    renderUpload(null)

    await pickAndCrop(user, makeFile('me.png', 'image/png', 1000))
    expect(await screen.findByText('Upload refused')).toBeInTheDocument()

    // Only picked — not saved yet. The old failure is no longer news.
    await user.upload(fileInput(), makeFile('again.png', 'image/png', 1000))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByText('Upload refused')).not.toBeInTheDocument()
  })
})