import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { AddExerciseCard } from './AddExerciseCard'

describe('AddExerciseCard', () => {
  it('links to the new-exercise route', () => {
    render(
      <MemoryRouter>
        <AddExerciseCard />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('link', { name: /Add New Exercise/ }),
    ).toHaveAttribute('href', '/practitioner/library/new')
  })
})