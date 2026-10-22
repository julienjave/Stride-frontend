import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import {
  ADDRESS_TAKEN_MESSAGE,
  ALREADY_CONFIRMED_MESSAGE,
  DEAD_LINK_MESSAGE,
  changeEmailSchema,
  failureText,
  formatLinkExpiry,
  isAddressTaken,
  isAlreadyConfirmed,
  isDeadLink,
} from './emailChangeRules'

function apiError(statusCode: number, ...message: string[]) {
  return new ApiError({ statusCode, message, error: 'Error', timestamp: '', path: '' })
}

// Which refusal is which: a status ALONE can't say (a 400 is a dead link, a
// wrong password or a malformed body; a 409 is "taken" or "too late") — the
// backend's own words do.
describe('reading a refusal', () => {
  it('knows a dead link by its status AND its words', () => {
    expect(isDeadLink(apiError(400, DEAD_LINK_MESSAGE))).toBe(true)
    expect(isDeadLink(apiError(400, 'token must be a string'))).toBe(false)
    expect(isDeadLink(apiError(409, DEAD_LINK_MESSAGE))).toBe(false)
    expect(isDeadLink(new Error(DEAD_LINK_MESSAGE))).toBe(false)
  })

  it('tells "taken since" from "too late to cancel" — both 409s', () => {
    expect(isAddressTaken(apiError(409, ADDRESS_TAKEN_MESSAGE))).toBe(true)
    expect(isAddressTaken(apiError(409, ALREADY_CONFIRMED_MESSAGE))).toBe(false)
    expect(isAlreadyConfirmed(apiError(409, ALREADY_CONFIRMED_MESSAGE))).toBe(true)
    expect(isAlreadyConfirmed(apiError(409, ADDRESS_TAKEN_MESSAGE))).toBe(false)
    expect(isAddressTaken(apiError(400, ADDRESS_TAKEN_MESSAGE))).toBe(false)
  })

  it("says the server's words, or a plain sentence when there was no answer", () => {
    expect(failureText(apiError(429, 'Too many requests', 'Wait a minute'))).toBe(
      'Too many requests Wait a minute',
    )
    expect(failureText(new TypeError('Failed to fetch'))).toBe(
      'Something went wrong. Check your connection and try again.',
    )
  })
})

describe('changeEmailSchema', () => {
  const parse = (newEmail: string, currentPassword = 'password123') =>
    changeEmailSchema.safeParse({ newEmail, currentPassword })
  const firstMessage = (newEmail: string, currentPassword?: string) =>
    parse(newEmail, currentPassword).error?.issues[0].message

  it('trims the address before checking and sending it', () => {
    expect(parse('  pat.new@example.com ').data?.newEmail).toBe('pat.new@example.com')
  })

  it('refuses an empty, an invalid and an over-long address', () => {
    expect(firstMessage('   ')).toBe('Enter the new email address')
    expect(firstMessage('pat.new')).toBe('Enter a valid email address')
    expect(firstMessage(`${'a'.repeat(244)}@example.com`)).toBe(
      'An email address can be at most 255 characters',
    )
    expect(parse(`${'a'.repeat(243)}@example.com`).success).toBe(true)
  })

  it('needs the current password, and keeps it exactly as typed', () => {
    expect(firstMessage('pat.new@example.com', '')).toBe('Enter your current password')
    expect(parse('pat.new@example.com', ' pass word ').data?.currentPassword).toBe(' pass word ')
  })
})

describe('formatLinkExpiry', () => {
  // 2031-03-14 13:30 UTC: a Friday in Paris, Montreal and UTC alike — the
  // hour depends on the zone, the day and the minutes don't.
  it('names the day as well as the time — the link lasts 24 hours', () => {
    const text = formatLinkExpiry('2031-03-14T13:30:00.000Z', 'en-US')
    expect(text).toMatch(/^Fri, Mar 14, \d{1,2}:30\s(AM|PM)$/)
  })
})