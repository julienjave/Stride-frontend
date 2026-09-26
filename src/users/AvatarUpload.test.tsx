import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AvatarUpload } from './AvatarUpload'
import { useUser } from './useUser'
import { userQueryKey, usersListQueryKey } from './api'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { User } from './types'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

// test-setup.ts replaces URL.revokeObjectURL with a vi.fn() (jsdom has
// none). spyOn gives a handle to it that can be asserted on and cleared
// between tests — referencing `URL.revokeObjectURL` directly in expect()
// trips the unbound-method lint rule.
const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL')

beforeEach(() => {
  fetchMock.mockReset()
  revokeObjectURL.mockClear()
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
// initials are showing.
function displayedPhoto() {
  return document.querySelector('img')
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
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a file over 5MB, without calling the API', async () => {
    const user = userEvent.setup()
    renderUpload()

    await user.upload(fileInput(), makeFile('huge.png', 'image/png', 6 * 1024 * 1024))

    expect(await screen.findByRole('alert')).toHaveTextContent('Image must be 5MB or smaller')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('AvatarUpload — uploading', () => {
  it('shows the picked file straight away, and disables both buttons while it uploads', async () => {
    // Never resolves: freezes the "in flight" moment for inspection.
    fetchMock.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.upload(fileInput(), makeFile('me.png', 'image/png', 1000))

    // test-setup.ts stubs URL.createObjectURL to return this string.
    expect(displayedPhoto()).toHaveAttribute('src', 'blob:mock-object-url')
    expect(await screen.findByRole('button', { name: 'Uploading…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeDisabled()
  })

  it('POSTs the file as multipart form data, then shows the saved photo', async () => {
    fetchMock.mockResolvedValue(jsonResponse(makeUser(NEW_URL)))
    const user = userEvent.setup()
    renderUpload(null)

    const file = makeFile('me.png', 'image/png', 1000)
    await user.upload(fileInput(), file)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0]
    expect(urlOf(url)).toMatch(/\/users\/5\/avatar$/)
    expect(init?.method).toBe('POST')
    // A FormData body under the field name "file" — what the backend's
    // FileInterceptor('file') reads. JSON here would never parse.
    const body = init?.body
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBe(file)
    // No hand-written Content-Type: the browser must add its own, with the
    // multipart boundary in it.
    expect(init?.headers).toEqual({})

    // What the person sees: the SAVED photo (from the response, through
    // the cache), not the local preview any more — which has been
    // released.
    await waitFor(() => expect(displayedPhoto()).toHaveAttribute('src', NEW_URL))
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-object-url')
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

    await user.upload(fileInput(), makeFile('me.png', 'image/png', 1000))

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

    await user.upload(fileInput(), makeFile('p.png', 'image/png', 1000))

    await waitFor(() => expect(displayedPhoto()).toHaveAttribute('src', NEW_URL))
    expect(queryClient.getQueryData(currentUserQueryKey)).toEqual(admin)
  })

  it('on failure: shows the backend message and drops the preview, since nothing was saved', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ statusCode: 400, message: ['Only JPEG, PNG, and WebP images are allowed'] }, 400),
    )
    const user = userEvent.setup()
    renderUpload(null)

    await user.upload(fileInput(), makeFile('me.png', 'image/png', 1000))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only JPEG, PNG, and WebP images are allowed',
    )
    // Back to what's really stored: no photo, so initials.
    expect(displayedPhoto()).toBeNull()
    expect(screen.getByText('JR')).toBeInTheDocument()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-object-url')
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
      .mockResolvedValueOnce(jsonResponse({ statusCode: 500, message: ['Upload broke'] }, 500))
      .mockResolvedValueOnce(jsonResponse(makeUser(null)))
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.upload(fileInput(), makeFile('me.png', 'image/png', 1000))
    expect(await screen.findByText('Upload broke')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))

    await waitFor(() => expect(screen.queryByText('Upload broke')).not.toBeInTheDocument())
  })
})

describe('AvatarUpload — a new attempt replaces old messages', () => {
  it("clears a previous removal's error message when a new file is picked", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ statusCode: 500, message: ['Remove broke'] }, 500))
      .mockReturnValueOnce(new Promise(() => {}))
    const user = userEvent.setup()
    renderUpload(OLD_URL)

    await user.click(screen.getByRole('button', { name: 'Remove photo' }))
    expect(await screen.findByText('Remove broke')).toBeInTheDocument()

    await user.upload(fileInput(), makeFile('me.png', 'image/png', 1000))

    expect(screen.queryByText('Remove broke')).not.toBeInTheDocument()
  })
})