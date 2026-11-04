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
import { invitePatientSchema } from './schemas'

const valid = {
  firstName: 'Marie',
  lastName: 'Martin',
  email: 'marie@example.com',
  dateOfBirth: '1985-04-12',
  clinicId: '1',
}

// The message the form would show for one field, or undefined if valid.
function errorFor(field: keyof typeof valid, value: string) {
  const result = invitePatientSchema.safeParse({ ...valid, [field]: value })
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe('invitePatientSchema', () => {
  it('accepts a complete invitation', () => {
    expect(invitePatientSchema.safeParse(valid).success).toBe(true)
  })

  it('requires every field, each with its own message', () => {
    expect(errorFor('firstName', '')).toBe('First name is required')
    expect(errorFor('lastName', '')).toBe('Last name is required')
    expect(errorFor('email', '')).toBe('Enter a valid email address')
    expect(errorFor('dateOfBirth', '')).toBe('Date of birth is required')
    expect(errorFor('clinicId', '')).toBe('Select a clinic for this patient')
  })

  it('rejects an address that is not an email', () => {
    expect(errorFor('email', 'marie.example.com')).toBe('Enter a valid email address')
  })
})