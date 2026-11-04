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
import { changePasswordSchema, SAME_PASSWORD_MESSAGE } from './passwordChangeRules'

// The form's checks (decisions §13): the current password, then the shared
// rule for a new one, then "not the current one". Each refusal at its own
// field — `path` is what puts the message under the right input.
function issues(values: Record<string, string>) {
  const result = changePasswordSchema.safeParse(values)
  return result.success
    ? []
    : result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))
}

const VALID = { currentPassword: 'old secret', password: 'new secret', confirmPassword: 'new secret' }

describe('changePasswordSchema', () => {
  it('accepts a current password and a new one typed twice', () => {
    expect(issues(VALID)).toEqual([])
  })

  // Never trimmed: a space may be part of a password, and what is sent must
  // be exactly what was typed.
  it('keeps the passwords exactly as typed', () => {
    const parsed = changePasswordSchema.parse({
      currentPassword: ' old ',
      password: ' new secret ',
      confirmPassword: ' new secret ',
    })
    expect(parsed).toEqual({
      currentPassword: ' old ',
      password: ' new secret ',
      confirmPassword: ' new secret ',
    })
  })

  it('asks for the current password', () => {
    expect(issues({ ...VALID, currentPassword: '' })).toEqual([
      { path: 'currentPassword', message: 'Enter your current password' },
    ])
  })

  // The SAME rule as every page that sets a password (newPasswordSchema) —
  // 8 is enough, 7 is not.
  it('applies the shared rule to the new password', () => {
    expect(issues({ ...VALID, password: 'seven77', confirmPassword: 'seven77' })).toEqual([
      { path: 'password', message: 'Password must be at least 8 characters' },
    ])
    expect(issues({ ...VALID, password: 'eight888', confirmPassword: 'eight888' })).toEqual([])
  })

  // The refinement newPasswordSchema carries survives the extension
  // (safeExtend) — a plain extend could have dropped it.
  it('says when the two copies differ, at the confirmation', () => {
    expect(issues({ ...VALID, confirmPassword: 'new secret!' })).toEqual([
      { path: 'confirmPassword', message: "Passwords don't match" },
    ])
  })

  it('refuses the current password as the new one, at the new password', () => {
    expect(
      issues({ currentPassword: 'same secret', password: 'same secret', confirmPassword: 'same secret' }),
    ).toEqual([{ path: 'password', message: SAME_PASSWORD_MESSAGE }])
  })
})