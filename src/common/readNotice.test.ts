import { describe, it, expect } from 'vitest'
import { readNotice } from './readNotice'

describe('readNotice', () => {
  it('reads a notice handed over through navigation state', () => {
    expect(readNotice({ notice: 'Session finished. Well done!' })).toBe('Session finished. Well done!')
  })

  it.each([null, undefined, 'notice', 42, {}, { notice: 7 }, { from: '/x' }])(
    'reads nothing from %j',
    (state) => {
      expect(readNotice(state)).toBeNull()
    },
  )
})