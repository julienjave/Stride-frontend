import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { useAccountFont } from './useAccountFont'
import { FONT_STORAGE_KEY, READABLE_FONT_CLASS } from './font'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

const html = () => document.documentElement
const stored = () => localStorage.getItem(FONT_STORAGE_KEY)

// The hook as App runs it, over a cache seeded with the current user:
// an object = signed in, `null` = known to be signed out, `undefined` =
// not known yet (the bootstrap's /auth/me still in flight — the fetch is
// left hanging so it stays that way).
function renderWithUser(user: { id: number; readableFont: boolean } | null | undefined) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (user !== undefined) {
    queryClient.setQueryData(currentUserQueryKey, user)
  } else {
    fetchMock.mockReturnValue(new Promise(() => {}))
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  renderHook(() => useAccountFont(), { wrapper })
  return { queryClient }
}

describe('useAccountFont', () => {
  it("applies the signed-in account's setting, and copies it to this device", () => {
    renderWithUser({ id: 7, readableFont: true })
    expect(html()).toHaveClass(READABLE_FONT_CLASS)
    expect(stored()).toBe('readable')
  })

  it("an account with it off wins over a copy someone else left on this device", () => {
    // Morgan's choice, still on the computer; Alex signs in.
    localStorage.setItem(FONT_STORAGE_KEY, 'readable')
    html().classList.add(READABLE_FONT_CLASS)

    renderWithUser({ id: 8, readableFont: false })

    expect(html()).not.toHaveClass(READABLE_FONT_CLASS)
    expect(stored()).toBeNull()
  })

  it('signed out: the default font, and nothing left on this device', () => {
    localStorage.setItem(FONT_STORAGE_KEY, 'readable')
    html().classList.add(READABLE_FONT_CLASS)

    renderWithUser(null)

    expect(html()).not.toHaveClass(READABLE_FONT_CLASS)
    expect(stored()).toBeNull()
  })

  it("not known yet: leaves the pre-paint script's choice as it is", () => {
    // What index.html's script did from this device's copy, before React.
    localStorage.setItem(FONT_STORAGE_KEY, 'readable')
    html().classList.add(READABLE_FONT_CLASS)

    renderWithUser(undefined)

    expect(html()).toHaveClass(READABLE_FONT_CLASS)
    expect(stored()).toBe('readable')
  })

  // waitFor: TanStack Query tells its observers of a cache change on a
  // LATER tick (its notifyManager batches them, on a timer), so the
  // re-render — and the effect — come after the change itself returns.
  it('follows the account as it changes — a tick in the menu, then signing out', async () => {
    const { queryClient } = renderWithUser({ id: 7, readableFont: false })
    expect(html()).not.toHaveClass(READABLE_FONT_CLASS)

    act(() => {
      queryClient.setQueryData(currentUserQueryKey, { id: 7, readableFont: true })
    })
    await waitFor(() => expect(html()).toHaveClass(READABLE_FONT_CLASS))
    expect(stored()).toBe('readable')

    act(() => {
      queryClient.setQueryData(currentUserQueryKey, null)
    })
    await waitFor(() => expect(html()).not.toHaveClass(READABLE_FONT_CLASS))
    expect(stored()).toBeNull()
  })

  // How a page LOAD learns nobody is signed in: the bootstrap's /auth/me
  // answers 401 (Morgan's session expired, she never signed out) — the
  // cache then holds an error, not `null`. The sign-in page must not keep
  // her font.
  function renderAfterMe(response: Response) {
    fetchMock.mockResolvedValue(response)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    renderHook(() => useAccountFont(), { wrapper })
  }

  it('a 401 from the bootstrap is "signed out": the default font, the copy removed', async () => {
    localStorage.setItem(FONT_STORAGE_KEY, 'readable')
    html().classList.add(READABLE_FONT_CLASS)

    renderAfterMe(
      new Response(JSON.stringify({ statusCode: 401, message: ['Unauthorized'] }), { status: 401 }),
    )

    await waitFor(() => expect(html()).not.toHaveClass(READABLE_FONT_CLASS))
    expect(stored()).toBeNull()
  })

  it("any other failure says nothing about who is signed in: the choice stays", async () => {
    localStorage.setItem(FONT_STORAGE_KEY, 'readable')
    html().classList.add(READABLE_FONT_CLASS)

    renderAfterMe(
      new Response(JSON.stringify({ statusCode: 500, message: ['boom'] }), { status: 500 }),
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    // A tick for the answer to land and any effect to run.
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(html()).toHaveClass(READABLE_FONT_CLASS)
    expect(stored()).toBe('readable')
  })
})