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
import { programLock } from './programLock'

const OPEN = { status: 'active', isArchived: false } as const

describe('programLock', () => {
  it('is null for an open program of an active patient — or one not loaded yet', () => {
    expect(programLock(OPEN, true)).toBeNull()
    // Not known yet: changeable (the backend's 409 still stands behind it).
    expect(programLock(OPEN, undefined)).toBeNull()
  })

  it("is 'patient_deactivated' for an open program of a deactivated patient", () => {
    expect(programLock(OPEN, false)).toBe('patient_deactivated')
  })

  // Closed wins: reactivating wouldn't make it changeable.
  it.each([
    ['completed', { status: 'completed', isArchived: false }],
    ['cancelled', { status: 'cancelled', isArchived: false }],
    ['deleted', { status: 'active', isArchived: true }],
  ] as const)("is 'closed' for a %s program, whatever the account", (_label, program) => {
    expect(programLock(program, true)).toBe('closed')
    expect(programLock(program, false)).toBe('closed')
    expect(programLock(program, undefined)).toBe('closed')
  })
})