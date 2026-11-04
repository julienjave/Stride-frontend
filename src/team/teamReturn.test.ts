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