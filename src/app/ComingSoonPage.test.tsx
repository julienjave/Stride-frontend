import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComingSoonPage } from './ComingSoonPage'

describe('ComingSoonPage', () => {
  it('names the section as a heading and says it is coming soon', () => {
    render(<ComingSoonPage title="Messages" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Messages' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
  })
})