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
import { loginSchema, mfaCodeSchema } from './schemas'

describe('loginSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    const result = loginSchema.safeParse({
      email: 'a@b.com',
      password: 'anything',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'anything',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('mfaCodeSchema', () => {
  it('accepts exactly 6 digits', () => {
    expect(mfaCodeSchema.safeParse({ code: '482913' }).success).toBe(true)
  })

  it('rejects fewer than 6 digits', () => {
    expect(mfaCodeSchema.safeParse({ code: '1234' }).success).toBe(false)
  })

  it('rejects non-numeric characters', () => {
    expect(mfaCodeSchema.safeParse({ code: 'abcdef' }).success).toBe(false)
  })
})