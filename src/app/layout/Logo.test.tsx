import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Logo } from './Logo'

function renderLogo() {
  return render(
    <MemoryRouter>
      <Logo homePath="/practitioner" />
    </MemoryRouter>,
  )
}

describe('Logo', () => {
  it('links to the role’s home, named for what it does', () => {
    renderLogo()
    expect(screen.getByRole('link', { name: 'Stride home' })).toHaveAttribute(
      'href',
      '/practitioner',
    )
  })

  // jsdom applies no stylesheet, so it can't say WHICH image shows; what it
  // can check is the contract the stylesheet relies on: one image per theme,
  // each carrying the class that hides it in the other theme.
  it('holds the light and the dark lockup, each hidden in the other theme', () => {
    renderLogo()
    const link = screen.getByRole('link', { name: 'Stride home' })
    const images = [...link.querySelectorAll('img')]
    expect(images).toHaveLength(2)

    const [lightLogo, darkLogo] = images
    expect(lightLogo.getAttribute('src')).toMatch(/stride-light/)
    expect(lightLogo).toHaveClass('dark:hidden')
    expect(lightLogo).not.toHaveClass('hidden')

    expect(darkLogo.getAttribute('src')).toMatch(/stride-dark/)
    expect(darkLogo).toHaveClass('hidden', 'dark:block')
  })

  it('keeps the images out of the accessible name (said once, by the link)', () => {
    renderLogo()
    // alt="" marks an image as decorative: no image role, nothing read out.
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    for (const image of document.querySelectorAll('img')) {
      expect(image).toHaveAttribute('alt', '')
    }
  })
})