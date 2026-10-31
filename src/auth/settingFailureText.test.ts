import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { settingFailureText } from './settingFailureText'

// An ApiError as the client builds it from a refusal's body.
function apiError(statusCode: number, message: string[], requestId?: string): ApiError {
  return new ApiError({
    statusCode,
    message,
    error: 'Error',
    timestamp: '2031-01-01T00:00:00.000Z',
    path: '/users/7',
    ...(requestId ? { requestId } : {}),
  })
}

describe('settingFailureText', () => {
  it("gives a refusal's own words after what failed", () => {
    const refused = apiError(400, ['preferredWeightUnit must be one of: kg, lbs'])
    expect(settingFailureText('your weight unit', refused)).toBe(
      "Couldn't save your weight unit. preferredWeightUnit must be one of: kg, lbs",
    )
  })

  // The reference is joined to its label by a no-break space (apiErrors.ts —
  // kept on one line at 375 px): written \u00a0 here.
  it("gives the server's sentence and its reference for a 5xx", () => {
    const failed = apiError(500, ['Internal server error'], '7f3a1c2e-9b4d-4e1f-8a2b-3c4d5e6f7a8b')
    expect(settingFailureText('your email setting', failed)).toBe(
      "Couldn't save your email setting. Something went wrong on our side. Try again in a moment. Reference:\u00a07f3a1c2e.",
    )
  })

  it('asks to check the connection when nothing answered', () => {
    expect(settingFailureText('your weight unit', new TypeError('Failed to fetch'))).toBe(
      "Couldn't save your weight unit. Check your connection and try again.",
    )
  })
})