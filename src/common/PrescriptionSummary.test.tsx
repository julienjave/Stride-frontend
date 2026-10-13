import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrescriptionSummary } from './PrescriptionSummary'

// The line with a weight (shown through WeightValue, in the viewer's unit)
// is covered where it's used — TemplateDetailPage and the program page —
// with the signed-in user it needs. These cover the line's own rules.
const NOTHING = { sets: null, reps: null, durationInSeconds: null, weight: null, weightUnit: null }

describe('PrescriptionSummary', () => {
  it('joins what is prescribed', () => {
    render(<PrescriptionSummary prescription={{ ...NOTHING, sets: 3, durationInSeconds: 30 }} />)
    expect(screen.getByText('3 sets · 30s')).toBeInTheDocument()
  })

  it('renders nothing at all when nothing is prescribed — not an empty line', () => {
    const { container } = render(<PrescriptionSummary prescription={NOTHING} />)
    expect(container).toBeEmptyDOMElement()
  })
})