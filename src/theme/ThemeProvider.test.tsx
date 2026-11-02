import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from './ThemeProvider'
import { useTheme } from './ThemeContext'
import { THEME_STORAGE_KEY } from './theme'
import { installFakeMatchMedia } from './fakeMatchMedia'

afterEach(() => {
  vi.restoreAllMocks()
})

// A tiny consumer: shows what the context reports and offers buttons to
// change it — standing in for the real Settings menu, so these tests are
// about the provider's behavior only.
function Probe() {
  const { preference, resolvedTheme, setPreference } = useTheme()
  return (
    <div>
      <p>preference: {preference}</p>
      <p>resolved: {resolvedTheme}</p>
      <button onClick={() => setPreference('light')}>light</button>
      <button onClick={() => setPreference('dark')}>dark</button>
      <button onClick={() => setPreference('system')}>system</button>
    </div>
  )
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )
}

const html = () => document.documentElement

describe('ThemeProvider', () => {
  it('starts from the stored preference and applies it to <html>', () => {
    installFakeMatchMedia(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderProvider()
    expect(screen.getByText('preference: dark')).toBeInTheDocument()
    expect(html().classList.contains('dark')).toBe(true)
    expect(html().style.colorScheme).toBe('dark')
  })

  it('defaults to system, following a dark OS', () => {
    installFakeMatchMedia(true)
    renderProvider()
    expect(screen.getByText('preference: system')).toBeInTheDocument()
    expect(screen.getByText('resolved: dark')).toBeInTheDocument()
    expect(html().classList.contains('dark')).toBe(true)
  })

  it('on system, follows the OS changing while the app is open', () => {
    const os = installFakeMatchMedia(false)
    renderProvider()
    expect(html().classList.contains('dark')).toBe(false)

    // act(): the OS change triggers a React state update outside any user
    // event; act makes the test wait for that re-render to finish.
    act(() => os.setSystemDark(true))
    expect(screen.getByText('resolved: dark')).toBeInTheDocument()
    expect(html().classList.contains('dark')).toBe(true)

    act(() => os.setSystemDark(false))
    expect(html().classList.contains('dark')).toBe(false)
  })

  it('an explicit choice overrides the OS, including later OS changes', async () => {
    const os = installFakeMatchMedia(true)
    renderProvider()
    await userEvent.click(screen.getByRole('button', { name: 'light' }))
    expect(html().classList.contains('dark')).toBe(false)

    act(() => os.setSystemDark(false))
    act(() => os.setSystemDark(true))
    expect(screen.getByText('resolved: light')).toBeInTheDocument()
    expect(html().classList.contains('dark')).toBe(false)
  })

  it('saves each choice to localStorage and applies it immediately', async () => {
    installFakeMatchMedia(false)
    renderProvider()

    await userEvent.click(screen.getByRole('button', { name: 'dark' }))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(html().classList.contains('dark')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'system' }))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
    expect(html().classList.contains('dark')).toBe(false)
  })

  it('stops listening to the OS once unmounted', () => {
    const os = installFakeMatchMedia(false)
    const { unmount } = renderProvider()
    expect(os.listenerCount()).toBeGreaterThan(0)
    unmount()
    expect(os.listenerCount()).toBe(0)
  })
})

describe('useTheme', () => {
  it('throws a clear error outside ThemeProvider', () => {
    // React logs the thrown error to console.error before rethrowing;
    // silencing it keeps the test output readable. The assertion is on
    // the throw itself.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Probe />)).toThrow(
      'useTheme must be used inside <ThemeProvider>',
    )
  })
})