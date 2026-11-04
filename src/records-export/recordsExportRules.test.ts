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
import { ApiError } from '@/api/client'
import {
  attemptsLeftText,
  browserTimeZone,
  dateOfBirthError,
  describeLink,
  downloadFailureText,
  formatLinkMoment,
  linkRefusal,
  UNUSABLE_WARNINGS,
} from './recordsExportRules'
import type { RecordsExportLinkSummary } from './types'

function apiError(statusCode: number, message: string[], extra: object = {}, retryAfter?: number) {
  return new ApiError(
    { statusCode, message, error: 'Error', timestamp: '2031-03-10T12:00:00.000Z', path: '/x', ...extra },
    retryAfter,
  )
}

describe('browserTimeZone', () => {
  it("is the zone the Intl API reports for this device", () => {
    expect(browserTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(browserTimeZone()).not.toBe('')
  })
})

describe('downloadFailureText', () => {
  // The throttler's own words are a class name, not a sentence.
  it('words a 429 itself — with the wait when Retry-After could be read', () => {
    const throttled = ['ThrottlerException: Too Many Requests']
    expect(downloadFailureText(apiError(429, throttled, {}, 42))).toBe(
      'Too many downloads in a short time. Try again in 42 seconds.',
    )
    expect(downloadFailureText(apiError(429, throttled, {}, 1))).toBe(
      'Too many downloads in a short time. Try again in 1 second.',
    )
    expect(downloadFailureText(apiError(429, throttled))).toBe(
      'Too many downloads in a short time. Wait a minute, then try again.',
    )
    // A header that isn't a number (Number('soon') is NaN).
    expect(downloadFailureText(apiError(429, throttled, {}, Number.NaN))).toBe(
      'Too many downloads in a short time. Wait a minute, then try again.',
    )
  })

  it('hides the server words of a 5xx — and only of a 5xx', () => {
    expect(downloadFailureText(apiError(500, ['Internal server error']))).toBe(
      "Your copy couldn't be made just now. Try again in a moment.",
    )
    expect(downloadFailureText(apiError(503, ['Service Unavailable']))).toBe(
      "Your copy couldn't be made just now. Try again in a moment.",
    )
    // 499 is not a server failure: its words are shown.
    expect(downloadFailureText(apiError(499, ['Client closed']))).toBe('Client closed')
  })

  it("shows any other refusal in the server's own words", () => {
    expect(
      downloadFailureText(apiError(400, ['timeZone must be a time zone name', 'and more'])),
    ).toBe('timeZone must be a time zone name and more')
  })

  it('blames the connection when there was no answer', () => {
    expect(downloadFailureText(new TypeError('Failed to fetch'))).toBe(
      'Something went wrong. Check your connection and try again.',
    )
  })
})

describe('linkRefusal', () => {
  it('reads a 404 as a link that is not valid', () => {
    expect(linkRefusal(apiError(404, ['This download link is not valid']))).toStrictEqual({
      kind: 'not_valid',
      message: 'This download link is not valid',
    })
  })

  it("reads a 410 as an unusable link, with each known reason", () => {
    for (const reason of ['used', 'replaced', 'locked', 'expired'] as const) {
      expect(linkRefusal(apiError(410, ['Gone.', 'Ask.'], { reason }))).toStrictEqual({
        kind: 'unusable',
        reason,
        message: 'Gone. Ask.',
      })
    }
  })

  // A reason this page doesn't know — or none, or not text — gives no
  // particular heading, never a made-up one.
  it('trusts no reason it does not know', () => {
    for (const reason of ['stolen', 7, undefined, 'toString']) {
      expect(linkRefusal(apiError(410, ['Gone'], { reason }))).toStrictEqual({
        kind: 'unusable',
        reason: null,
        message: 'Gone',
      })
    }
  })

  it('reads the wrong date of birth, with the tries left', () => {
    const wrong = ["This date of birth doesn't match the one on file."]
    expect(linkRefusal(apiError(400, wrong, { attemptsLeft: 3 }))).toStrictEqual({
      kind: 'wrong_date',
      message: "This date of birth doesn't match the one on file.",
      attemptsLeft: 3,
    })
    // Without a count (an older backend): still the wrong date, no number.
    expect(linkRefusal(apiError(400, wrong, { attemptsLeft: '3' }))).toStrictEqual({
      kind: 'wrong_date',
      message: "This date of birth doesn't match the one on file.",
      attemptsLeft: null,
    })
  })

  // Another 400 (the DTO refusing a malformed date) is not a wrong date: it
  // counts no try, so it mustn't say how many are left.
  it('leaves every other answer to the plain failure text', () => {
    expect(linkRefusal(apiError(400, ['dateOfBirth must be a date'], { attemptsLeft: 3 }))).toBeNull()
    expect(linkRefusal(apiError(429, ['ThrottlerException: Too Many Requests']))).toBeNull()
    expect(linkRefusal(apiError(500, ['Internal server error']))).toBeNull()
    expect(linkRefusal(new TypeError('Failed to fetch'))).toBeNull()
    expect(linkRefusal(null)).toBeNull()
  })
})

describe('UNUSABLE_WARNINGS', () => {
  // Only where someone else may have the link.
  it('warns for a used or a locked link, and only those', () => {
    expect(UNUSABLE_WARNINGS).toStrictEqual({
      used: "If you didn't download it yourself, tell your clinic: someone else may have opened the link.",
      locked: "If you didn't type those dates, tell your clinic: someone else may have tried the link.",
    })
  })
})

describe('attemptsLeftText', () => {
  it('counts the tries, and warns before the last one', () => {
    expect(attemptsLeftText(4)).toBe('4 tries left.')
    expect(attemptsLeftText(2)).toBe('2 tries left.')
    expect(attemptsLeftText(1)).toBe('1 try left. After one more wrong date, this link stops working.')
  })
})

describe('dateOfBirthError', () => {
  it('asks for a date only when none was chosen', () => {
    expect(dateOfBirthError('')).toBe('Enter your date of birth')
    expect(dateOfBirthError('1990-04-12')).toBeNull()
  })
})

describe('formatLinkMoment', () => {
  it('shows the day and the time to the minute, in the given zone', () => {
    expect(formatLinkMoment('2031-03-10T13:02:59.000Z', 'en-GB', 'UTC')).toBe('10 Mar 2031, 13:02')
    expect(formatLinkMoment('2031-03-10T13:02:59.000Z', 'en-GB', 'America/Montreal')).toBe(
      '10 Mar 2031, 09:02',
    )
  })
})

describe('describeLink', () => {
  const base: RecordsExportLinkSummary = {
    id: 3,
    status: 'open',
    createdAt: '2031-03-10T09:00:00.000Z',
    expiresAt: '2031-03-13T09:00:00.000Z',
    emailSentAt: '2031-03-10T09:00:01.000Z',
    usedAt: null,
    replacedAt: null,
    dateOfBirthFailures: 0,
    sentBy: { id: 1, firstName: 'Avery', lastName: 'Admin' },
  }
  const describe_ = (link: Partial<RecordsExportLinkSummary>) =>
    describeLink({ ...base, ...link }, 'en-GB', 'UTC')

  it('an open link: sent, and until when it works', () => {
    expect(describe_({})).toStrictEqual({
      label: 'Not used yet',
      text: 'Sent by Avery Admin on 10 Mar 2031, 09:00. Works until 13 Mar 2031, 09:00.',
      needsAction: false,
    })
  })

  // The link exists, but the patient never got it — the one case to act on.
  it("an open link whose email couldn't be sent: says so, and asks for another", () => {
    expect(describe_({ emailSentAt: null })).toStrictEqual({
      label: 'Email not sent',
      text: "Created by Avery Admin on 10 Mar 2031, 09:00, but the email couldn't be sent. The patient never received this link — send another one.",
      needsAction: true,
    })
  })

  it('a used link: when it was downloaded', () => {
    expect(describe_({ status: 'used', usedAt: '2031-03-11T18:30:00.000Z' })).toStrictEqual({
      label: 'Downloaded',
      text: 'Sent by Avery Admin on 10 Mar 2031, 09:00. Downloaded on 11 Mar 2031, 18:30.',
      needsAction: false,
    })
  })

  it('a replaced link: when the newer one closed it', () => {
    expect(describe_({ status: 'replaced', replacedAt: '2031-03-12T08:00:00.000Z' })).toStrictEqual({
      label: 'Replaced',
      text: 'Sent by Avery Admin on 10 Mar 2031, 09:00. Replaced by a newer link on 12 Mar 2031, 08:00.',
      needsAction: false,
    })
  })

  it('a locked link: five wrong dates of birth — counted once, in that sentence', () => {
    expect(describe_({ status: 'locked', dateOfBirthFailures: 5 })).toStrictEqual({
      label: 'Locked',
      text: 'Sent by Avery Admin on 10 Mar 2031, 09:00. Locked after 5 wrong dates of birth — it no longer works.',
      needsAction: false,
    })
  })

  it('an expired link: when, and that it was never used', () => {
    expect(describe_({ status: 'expired' })).toStrictEqual({
      label: 'Expired',
      text: 'Sent by Avery Admin on 10 Mar 2031, 09:00. Expired on 13 Mar 2031, 09:00 without being used.',
      needsAction: false,
    })
  })

  // A closed link whose email failed still says so: the first sentence is
  // about the email, whatever happened next — and only an OPEN one is
  // something to act on.
  it("keeps saying a closed link's email failed, without asking to act", () => {
    expect(describe_({ status: 'expired', emailSentAt: null })).toStrictEqual({
      label: 'Expired',
      text: "Created by Avery Admin on 10 Mar 2031, 09:00, but the email couldn't be sent. Expired on 13 Mar 2031, 09:00 without being used.",
      needsAction: false,
    })
  })

  // Wrong dates typed on a link that's still open, or that ended otherwise:
  // someone tried — the admin should know.
  it('counts the wrong dates of birth on any link that is not locked', () => {
    expect(describe_({ dateOfBirthFailures: 1 }).text).toBe(
      'Sent by Avery Admin on 10 Mar 2031, 09:00. Works until 13 Mar 2031, 09:00. 1 wrong date of birth typed.',
    )
    expect(
      describe_({ status: 'used', usedAt: '2031-03-11T18:30:00.000Z', dateOfBirthFailures: 2 }).text,
    ).toBe(
      'Sent by Avery Admin on 10 Mar 2031, 09:00. Downloaded on 11 Mar 2031, 18:30. 2 wrong dates of birth typed.',
    )
    expect(describe_({ emailSentAt: null, dateOfBirthFailures: 3 }).text).toMatch(
      / send another one\. 3 wrong dates of birth typed\.$/,
    )
    expect(
      describe_({ status: 'replaced', replacedAt: '2031-03-12T08:00:00.000Z', dateOfBirthFailures: 4 }).text,
    ).toMatch(/ 08:00\. 4 wrong dates of birth typed\.$/)
    expect(describe_({ status: 'expired', dateOfBirthFailures: 2 }).text).toMatch(
      / without being used\. 2 wrong dates of birth typed\.$/,
    )
  })
})