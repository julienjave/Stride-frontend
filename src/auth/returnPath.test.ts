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