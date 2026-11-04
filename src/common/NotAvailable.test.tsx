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
import { NotAvailable } from './NotAvailable'

function renderIt(headingLevel?: 1 | 2) {
  render(
    <MemoryRouter>
      <NotAvailable
        title="Program not available"
        headingLevel={headingLevel}
        links={[
          { to: '/practitioner/patients', label: 'My patients' },
          { to: '/practitioner/programs', label: 'Programs' },
        ]}
      >
        This program doesn't exist, or it isn't yours.
      </NotAvailable>
    </MemoryRouter>,
  )
}

describe('NotAvailable', () => {
  it('shows a page heading, the sentence as an alert, and every way out', () => {
    renderIt()
    expect(screen.getByRole('heading', { level: 1, name: 'Program not available' })).toBeInTheDocument()
    // The alert carries the sentence ALONE (not the heading or the links):
    // that is what a screen reader announces when it replaces "Loading…".
    expect(screen.getByRole('alert')).toHaveTextContent(/^This program doesn't exist, or it isn't yours\.$/)
    const links = screen.getAllByRole('link')
    expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toStrictEqual([
      ['My patients', '/practitioner/patients'],
      ['Programs', '/practitioner/programs'],
    ])
  })

  it('is an <h2> inside a page that already has its <h1>', () => {
    renderIt(2)
    expect(screen.getByRole('heading', { level: 2, name: 'Program not available' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('adds no landmark of its own', () => {
    renderIt()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})