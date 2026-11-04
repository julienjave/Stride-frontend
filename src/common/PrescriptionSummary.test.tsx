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