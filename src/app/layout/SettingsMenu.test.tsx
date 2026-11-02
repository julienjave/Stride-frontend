import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsMenu } from './SettingsMenu'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { THEME_STORAGE_KEY } from '@/theme/theme'
import { FONT_STORAGE_KEY } from '@/theme/font'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import { findSnackbar } from '@/snackbars/snackbarAssertions'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

const me = {
  id: 7,
  firstName: 'Julien',
  activeRole: 'practitioner',
  roles: ['practitioner'],
  preferredWeightUnit: 'kg',
  messageEmailNotices: true,
  readableFont: false,
}

// `currentUser: null` = nobody logged in. Seeded directly, so
// useCurrentUser() never fetches /auth/me: every fetch a test sees is one
// the menu itself made.
function renderMenu(currentUser: typeof me | null = me) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, currentUser)
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsMenu />
      </ThemeProvider>
    </QueryClientProvider>,
  )
  return { queryClient }
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
}

// Each option's name and whether it's ticked, in menu order — within ONE
// named group, so the theme and weight-unit options never mix.
function options(groupName: string) {
  return within(screen.getByRole('group', { name: groupName }))
    .getAllByRole('menuitemradio')
    .map((item) => [item.textContent, item.getAttribute('aria-checked')])
}

describe('SettingsMenu — theme', () => {
  it('offers light, dark and system, with system chosen by default', async () => {
    renderMenu()
    await openMenu()
    expect(options('Theme')).toEqual([
      ['Light', 'false'],
      ['Dark', 'false'],
      ['System', 'true'],
    ])
  })

  it('ticks the stored choice', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    renderMenu()
    await openMenu()
    expect(options('Theme')).toEqual([
      ['Light', 'true'],
      ['Dark', 'false'],
      ['System', 'false'],
    ])
  })

  it('choosing Dark applies it, remembers it, and shows it ticked next time', async () => {
    renderMenu()
    await openMenu()
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Dark' }))

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    // Selecting an item closes the menu; reopening proves the menu reads
    // the new value back rather than just having drawn a tick locally.
    await openMenu()
    expect(
      screen.getByRole('menuitemradio', { name: 'Dark' }),
    ).toHaveAttribute('aria-checked', 'true')
  })
})

describe('SettingsMenu — weight unit', () => {
  it("ticks the account's saved unit", async () => {
    renderMenu({ ...me, preferredWeightUnit: 'lbs' })
    await openMenu()
    expect(options('Weight unit')).toEqual([
      ['kg', 'false'],
      ['lbs', 'true'],
    ])
  })

  it('is not offered without a logged-in user', async () => {
    renderMenu(null)
    await openMenu()
    expect(screen.queryByRole('group', { name: 'Weight unit' })).not.toBeInTheDocument()
  })

  // The optimistic part: a fetch that NEVER answers, so anything the test
  // sees happened before the server said a word.
  it('shows the new unit at once — before the server has answered — and sends it as a PATCH', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const { queryClient } = renderMenu()
    await openMenu()
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'lbs' }))

    await openMenu()
    expect(options('Weight unit')).toEqual([
      ['kg', 'false'],
      ['lbs', 'true'],
    ])
    // The shared cache itself — what every weight on the page reads.
    expect(queryClient.getQueryData(currentUserQueryKey)).toEqual({
      ...me,
      preferredWeightUnit: 'lbs',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toEqual(expect.stringMatching(/\/users\/7$/))
    expect(init?.method).toBe('PATCH')
    expect(init?.body).toBe('{"preferredWeightUnit":"lbs"}')
  })

  // The explanation is a failure SNACKBAR (decisions §33): the pick closed
  // the menu, so a sentence inside it went unseen until it was reopened.
  it('puts the old unit back and explains in a snackbar, when the save fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, message: 'Internal error' }), {
        status: 500,
      }),
    )
    renderMenu()
    await openMenu()
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'lbs' }))

    await findSnackbar(
      'failure',
      "Couldn't save your weight unit. Something went wrong on our side. Try again in a moment.",
    )
    await openMenu()
    // Nothing waits inside the menu any more.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(options('Weight unit')).toEqual([
      ['kg', 'true'],
      ['lbs', 'false'],
    ])
  })

  it('picking the unit that is already chosen sends nothing', async () => {
    renderMenu()
    await openMenu()
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'kg' }))

    // Give a (wrong) request every chance to go out before checking.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

// Roadmap Phase 6.5: "Email me about new messages".
describe('SettingsMenu — message emails', () => {
  const item = () => screen.getByRole('menuitemcheckbox', { name: 'Email me about new messages' })

  it('shows the setting ticked when it is on', async () => {
    renderMenu()
    await openMenu()
    expect(item()).toHaveAttribute('aria-checked', 'true')
  })

  it('shows it unticked when it is off', async () => {
    renderMenu({ ...me, messageEmailNotices: false })
    await openMenu()
    expect(item()).toHaveAttribute('aria-checked', 'false')
  })

  it('offers it to a patient, and to an account that is ALSO an admin', async () => {
    renderMenu({ ...me, activeRole: 'admin', roles: ['admin', 'patient'] })
    await openMenu()
    expect(item()).toBeInTheDocument()
  })

  it('does not offer it to an admin-only account, nor without a user', async () => {
    renderMenu({ ...me, activeRole: 'admin', roles: ['admin'] })
    await openMenu()
    expect(
      screen.queryByRole('menuitemcheckbox', { name: 'Email me about new messages' }),
    ).not.toBeInTheDocument()
  })

  it('turns it off at once and sends exactly that', async () => {
    let answer: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { queryClient } = renderMenu()
    await openMenu()
    await userEvent.click(item())

    // Before the server answers: the cached account already says off.
    expect(
      queryClient.getQueryData<typeof me>(currentUserQueryKey)?.messageEmailNotices,
    ).toBe(false)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url as string).toMatch(/\/users\/7$/)
    expect(init?.method).toBe('PATCH')
    expect(init?.body).toBe('{"messageEmailNotices":false}')
    answer(new Response(JSON.stringify({ ...me, messageEmailNotices: false }), { status: 200 }))
    await openMenu()
    expect(item()).toHaveAttribute('aria-checked', 'false')
  })

  it('asks the server again and explains in a snackbar, when the save fails', async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? new Response(JSON.stringify({ statusCode: 500, message: ['boom'] }), { status: 500 })
          : // The refetched /auth/me: the server still says ON.
            new Response(JSON.stringify(me), { status: 200 }),
      ),
    )
    renderMenu()
    await openMenu()
    await userEvent.click(item())

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => (input as string).endsWith('/auth/me'))).toBe(
        true,
      ),
    )
    await openMenu()
    await waitFor(() => expect(item()).toHaveAttribute('aria-checked', 'true'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await findSnackbar(
      'failure',
      "Couldn't save your email setting. Something went wrong on our side. Try again in a moment.",
    )
  })
})

// Decisions §39: "Easier-to-read font" — on the ACCOUNT since pass 3, for
// every role. (Applying it to the page is useAccountFont's job, tested
// there; the menu reads and changes the cached account.)
describe('SettingsMenu — text', () => {
  const item = () => screen.getByRole('menuitemcheckbox', { name: 'Easier-to-read font' })

  it("shows the account's setting, off, under its own label", async () => {
    renderMenu()
    await openMenu()
    expect(item()).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText('Text')).toBeInTheDocument()
  })

  it("shows it ticked when the account has it on — whatever this device remembers", async () => {
    renderMenu({ ...me, readableFont: true })
    await openMenu()
    expect(item()).toHaveAttribute('aria-checked', 'true')
  })

  it('ignores a choice left on this device by someone else', async () => {
    localStorage.setItem(FONT_STORAGE_KEY, 'readable')
    renderMenu()
    await openMenu()
    expect(item()).toHaveAttribute('aria-checked', 'false')
  })

  it('offers it to every role — an admin-only account too', async () => {
    renderMenu({ ...me, activeRole: 'admin', roles: ['admin'] })
    await openMenu()
    expect(item()).toBeInTheDocument()
  })

  it('is not offered without a logged-in user', async () => {
    renderMenu(null)
    await openMenu()
    expect(
      screen.queryByRole('menuitemcheckbox', { name: 'Easier-to-read font' }),
    ).not.toBeInTheDocument()
  })

  it('turns it on at once and sends exactly that to the account', async () => {
    let answer: (response: Response) => void = () => {}
    fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const { queryClient } = renderMenu()
    await openMenu()
    await userEvent.click(item())

    // Before the server answers: the cached account already says on — the
    // page's font follows it (useAccountFont).
    expect(queryClient.getQueryData<typeof me>(currentUserQueryKey)?.readableFont).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url as string).toMatch(/\/users\/7$/)
    expect(init?.method).toBe('PATCH')
    expect(init?.body).toBe('{"readableFont":true}')
    answer(new Response(JSON.stringify({ ...me, readableFont: true }), { status: 200 }))
    await openMenu()
    expect(item()).toHaveAttribute('aria-checked', 'true')
  })

  it('asks the server again and explains in a snackbar, when the save fails', async () => {
    fetchMock.mockImplementation((_input, init) =>
      Promise.resolve(
        init?.method === 'PATCH'
          ? new Response(JSON.stringify({ statusCode: 500, message: ['boom'] }), { status: 500 })
          : // The refetched /auth/me: the server still says OFF.
            new Response(JSON.stringify(me), { status: 200 }),
      ),
    )
    renderMenu()
    await openMenu()
    await userEvent.click(item())

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([input]) => (input as string).endsWith('/auth/me'))).toBe(
        true,
      ),
    )
    await openMenu()
    await waitFor(() => expect(item()).toHaveAttribute('aria-checked', 'false'))
    await findSnackbar(
      'failure',
      "Couldn't save your font setting. Something went wrong on our side. Try again in a moment.",
    )
  })
})