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

import { describe, it, expect, afterEach } from 'vitest'
import {
  destinationAfterSignIn,
  forgetSignedInUser,
  rememberSignedInUser,
  returnState,
} from './returnPath'

afterEach(() => {
  forgetSignedInUser()
})

describe('returnState', () => {
  it('names no owner when nobody was signed in in this tab (a link opened while signed out)', () => {
    expect(returnState('/admin')).toStrictEqual({ from: '/admin' })
  })

  it('names the last account seen signed in', () => {
    rememberSignedInUser(7)
    expect(returnState('/practitioner/patients/5')).toStrictEqual({
      from: '/practitioner/patients/5',
      fromUserId: 7,
    })
  })

  it('takes an owner handed to it over the remembered one (the 401 handler reads the cache)', () => {
    rememberSignedInUser(7)
    expect(returnState('/profile', 9)).toStrictEqual({ from: '/profile', fromUserId: 9 })
  })
})

describe('destinationAfterSignIn', () => {
  it('returns the owner to their page', () => {
    expect(destinationAfterSignIn({ from: '/practitioner/library', fromUserId: 7 }, 7)).toBe(
      '/practitioner/library',
    )
  })

  it('sends anyone else home', () => {
    expect(destinationAfterSignIn({ from: '/practitioner/library', fromUserId: 7 }, 8)).toBe('/')
  })

  it('honours a page with no owner for whoever signs in', () => {
    expect(destinationAfterSignIn({ from: '/admin' }, 8)).toBe('/admin')
  })

  it('goes home when there is nothing usable to return to', () => {
    for (const state of [null, undefined, 'x', {}, { email: 'a@b.c' }, { from: 42 }]) {
      expect(destinationAfterSignIn(state, 7), JSON.stringify(state)).toBe('/')
    }
  })
})