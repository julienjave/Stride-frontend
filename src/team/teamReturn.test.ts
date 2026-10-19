import { describe, expect, it } from 'vitest'
import { readViewedPractitioner, viewedPractitionerState } from './teamReturn'

describe('teamReturn', () => {
  it('reads back the practitioner it wrote', () => {
    expect(readViewedPractitioner(viewedPractitionerState(3))).toBe(3)
  })

  it.each([
    ['no state (a typed address)', null],
    ['undefined', undefined],
    ['another page note', { from: 'program', programId: 3 }],
    ['a wrong type', { viewedPractitionerId: '3' }],
    ['not an object', 3],
  ])('answers null for %s', (_what, state) => {
    expect(readViewedPractitioner(state)).toBeNull()
  })
})