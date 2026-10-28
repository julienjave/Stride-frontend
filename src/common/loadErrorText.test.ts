import { describe, it, expect } from 'vitest'
import { ApiError } from '@/api/client'
import { loadErrorText } from './loadErrorText'

function apiError(statusCode: number, message: string[]) {
  return new ApiError({ statusCode, message, error: 'Error', timestamp: '', path: '' })
}

describe('loadErrorText', () => {
  it('no answer at all (the network): what failed, then to check the connection', () => {
    expect(loadErrorText('your patients', new TypeError('Failed to fetch'), false)).toBe(
      "Couldn't load your patients. Check your connection and try again.",
    )
  })

  it('a 5xx: the server\'s side, in the shared sentence — never its own words', () => {
    expect(loadErrorText('your patients', apiError(500, ['Internal server error']), false)).toBe(
      "Couldn't load your patients. Something went wrong on our side. Try again in a moment.",
    )
  })

  it("a refusal: the server's own words (a 429 says how long to wait)", () => {
    const tooMany = apiError(429, ['Too many attempts in a short time. Try again in 40 seconds.'])
    expect(loadErrorText('your patients', tooMany, false)).toBe(
      "Couldn't load your patients. Too many attempts in a short time. Try again in 40 seconds.",
    )
  })

  it('after a failed retry: "Still couldn\'t", the reason the same way', () => {
    expect(loadErrorText('this program', apiError(503, ['Service Unavailable']), true)).toBe(
      "Still couldn't load this program. Something went wrong on our side. Try again in a moment.",
    )
  })
})