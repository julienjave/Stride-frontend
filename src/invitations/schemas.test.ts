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
import { acceptInvitationSchema } from './schemas'

// The boundaries match AcceptInvitationDto on the backend (8–128): a
// stricter frontend would refuse passwords the backend accepts, a looser
// one would send passwords bound to fail.
describe('acceptInvitationSchema', () => {
  it('accepts a password of exactly 8 characters, typed twice', () => {
    const result = acceptInvitationSchema.safeParse({
      password: '12345678',
      confirmPassword: '12345678',
    })
    expect(result.success).toBe(true)
  })

  it('refuses 7 characters, on the password field', () => {
    const result = acceptInvitationSchema.safeParse({
      password: '1234567',
      confirmPassword: '1234567',
    })
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ['password'],
        message: 'Password must be at least 8 characters',
      }),
    ])
  })

  it('accepts 128 characters and refuses 129', () => {
    const ok = 'a'.repeat(128)
    const tooLong = 'a'.repeat(129)
    expect(acceptInvitationSchema.safeParse({ password: ok, confirmPassword: ok }).success).toBe(
      true,
    )
    expect(
      acceptInvitationSchema.safeParse({ password: tooLong, confirmPassword: tooLong }).success,
    ).toBe(false)
  })

  it('reports a mismatch on the confirmation field', () => {
    const result = acceptInvitationSchema.safeParse({
      password: 'my-new-password',
      confirmPassword: 'my-new-passwork',
    })
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['confirmPassword'], message: "Passwords don't match" }),
    ])
  })
})