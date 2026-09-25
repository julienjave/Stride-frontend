import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsMenu } from './SettingsMenu'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { THEME_STORAGE_KEY } from '@/theme/theme'

function renderMenu() {
  return render(
    <ThemeProvider>
      <SettingsMenu />
    </ThemeProvider>,
  )
}

async function openMenu() {
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
}

// Each option's name and whether it's ticked, in menu order.
function themeOptions() {
  return screen
    .getAllByRole('menuitemradio')
    .map((item) => [item.textContent, item.getAttribute('aria-checked')])
}

describe('SettingsMenu', () => {
  it('offers light, dark and system, with system chosen by default', async () => {
    renderMenu()
    await openMenu()
    expect(themeOptions()).toEqual([
      ['Light', 'false'],
      ['Dark', 'false'],
      ['System', 'true'],
    ])
  })

  it('ticks the stored choice', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    renderMenu()
    await openMenu()
    expect(themeOptions()).toEqual([
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