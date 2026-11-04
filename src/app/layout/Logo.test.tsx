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

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Logo, LogoImages } from './Logo'

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

describe('LogoImages', () => {
  it('gives both lockups the alt text and the height it is handed', () => {
    render(<LogoImages alt="Stride" className="h-12" />)
    // jsdom applies no stylesheet, so BOTH images count here; in a browser
    // the hidden one is `display: none`, outside the accessibility tree —
    // a screen reader hears "Stride" once.
    const images = screen.getAllByRole('img', { name: 'Stride' })
    expect(images).toHaveLength(2)
    for (const image of images) {
      expect(image).toHaveClass('h-12', 'w-auto')
    }
    expect(images[0]).toHaveClass('dark:hidden')
    expect(images[1]).toHaveClass('hidden', 'dark:block')
  })
})