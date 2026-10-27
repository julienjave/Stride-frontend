import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { DEAD_LINK_MESSAGE, failureText, formatLinkExpiry, isDeadLink, readEmail } from './passwordResetRules'

function apiError(statusCode: number, message: string[]) {
  return new ApiError({ statusCode, message, error: 'Error', timestamp: '2031-03-04T10:00:00.000Z', path: '/auth/reset-password' })
}

describe('isDeadLink', () => {
  it("is the backend's one refusal for a dead link: a 400 with its words", () => {
    expect(isDeadLink(apiError(400, [DEAD_LINK_MESSAGE]))).toBe(true)
  })

  it('is not any other 400 (a password the DTO refuses), nor those words with another status', () => {
    expect(isDeadLink(apiError(400, ['newPassword must be longer than or equal to 8 characters']))).toBe(false)
    expect(isDeadLink(apiError(429, [DEAD_LINK_MESSAGE]))).toBe(false)
    expect(isDeadLink(new Error(DEAD_LINK_MESSAGE))).toBe(false)
    expect(isDeadLink(null)).toBe(false)
  })
})

describe('failureText', () => {
  it("uses the backend's words, else a line about the connection", () => {
    expect(failureText(apiError(429, ['Too many requests.', 'Try later.']))).toBe('Too many requests. Try later.')
    expect(failureText(new TypeError('Failed to fetch'))).toBe(
      'Something went wrong. Check your connection and try again.',
    )
  })
})

describe('readEmail', () => {
  it('reads an email carried in navigation state, and nothing else', () => {
    expect(readEmail({ email: 'pat@example.com' })).toBe('pat@example.com')
    expect(readEmail({ email: 42 })).toBe('')
    expect(readEmail({ from: '/x' })).toBe('')
    expect(readEmail(null)).toBe('')
    expect(readEmail('pat@example.com')).toBe('')
  })
})

describe('formatLinkExpiry', () => {
  it("gives the link's last moment as a time of day, in the locale's style", () => {
    // The hour depends on the machine's time zone; the minutes don't. One
    // digit or two in en-GB too ('8:05' before 10 a.m. — in Montreal, say).
    expect(formatLinkExpiry('2031-03-04T13:05:00.000Z', 'en-GB')).toMatch(/^\d{1,2}:05$/)
    expect(formatLinkExpiry('2031-03-04T13:05:00.000Z', 'en-US')).toMatch(/^\d{1,2}:05\s?(AM|PM)$/)
  })
})