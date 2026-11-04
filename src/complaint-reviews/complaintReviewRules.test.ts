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
import {
  describeReview,
  fallbackFileName,
  openReviewBody,
  REASON_REQUIRED,
  reasonError,
  STATUS_LABELS,
} from './complaintReviewRules'
import type { ComplaintReviewSummary } from './types'

// The complaint review's words and form rules (decisions §25, pass 2). en-GB
// and UTC pin the moments ("28 Oct 2031, 14:05").
const L = 'en-GB'
const Z = 'UTC'
const ME = 1
const AVERY = { id: ME, firstName: 'Avery', lastName: 'Admin' }
const OLIVE = { id: 2, firstName: 'Olive', lastName: 'Other' }

function review(extra: Partial<ComplaintReviewSummary> = {}): ComplaintReviewSummary {
  return {
    id: 12,
    status: 'open',
    reason: 'Knee worse',
    caseReference: null,
    openedBy: AVERY,
    openedAt: '2031-10-28T14:05:00.000Z',
    expiresAt: '2031-11-04T14:05:00.000Z',
    endedAt: null,
    endedBy: null,
    ...extra,
  }
}

describe('describeReview', () => {
  it('lets the admin who opened an open review make copies', () => {
    expect(describeReview(review(), ME, L, Z)).toStrictEqual({
      opened: 'Opened by you on 28 Oct 2031, 14:05.',
      end: 'Open until 4 Nov 2031, 14:05.',
      canCopy: true,
      copyNote: null,
    })
  })

  it('tells another admin who can make copies — and gives them no button', () => {
    expect(describeReview(review({ openedBy: OLIVE }), ME, L, Z)).toStrictEqual({
      opened: 'Opened by Olive Other on 28 Oct 2031, 14:05.',
      end: 'Open until 4 Nov 2031, 14:05.',
      canCopy: false,
      copyNote: 'Only Olive Other, who opened it, can download copies with it.',
    })
  })

  it('says who ended one early and when — no copies, no note', () => {
    expect(
      describeReview(
        review({ status: 'ended', endedAt: '2031-10-29T09:00:00.000Z', endedBy: OLIVE }),
        ME,
        L,
        Z,
      ),
    ).toStrictEqual({
      opened: 'Opened by you on 28 Oct 2031, 14:05.',
      end: 'Ended by Olive Other on 29 Oct 2031, 09:00.',
      canCopy: false,
      copyNote: null,
    })
    expect(
      describeReview(
        review({ status: 'ended', endedAt: '2031-10-29T09:00:00.000Z', endedBy: AVERY }),
        ME,
        L,
        Z,
      ).end,
    ).toBe('Ended by you on 29 Oct 2031, 09:00.')
  })

  it('says when an expired one ran out — for its opener too, no copies', () => {
    expect(describeReview(review({ status: 'expired' }), ME, L, Z)).toStrictEqual({
      opened: 'Opened by you on 28 Oct 2031, 14:05.',
      end: 'Expired on 4 Nov 2031, 14:05.',
      canCopy: false,
      copyNote: null,
    })
    expect(describeReview(review({ status: 'expired', openedBy: OLIVE }), ME, L, Z).copyNote).toBeNull()
  })

  it('labels every status', () => {
    expect(STATUS_LABELS).toStrictEqual({ open: 'Open', ended: 'Ended early', expired: 'Expired' })
  })
})

describe('the form', () => {
  it('asks for a reason that says something', () => {
    expect(reasonError('')).toBe(REASON_REQUIRED)
    expect(reasonError('  \n ')).toBe(REASON_REQUIRED)
    expect(reasonError(' Knee ')).toBeNull()
    expect(REASON_REQUIRED).toBe('Say why you are opening this review.')
  })

  it('sends both fields trimmed, and no case reference when there is none', () => {
    expect(openReviewBody('  Knee worse \n', '  CR-14 ')).toStrictEqual({
      reason: 'Knee worse',
      caseReference: 'CR-14',
    })
    expect(openReviewBody('Knee worse', '   ')).toStrictEqual({ reason: 'Knee worse' })
  })

  it('names a copy after its review when the browser hides the server’s name', () => {
    expect(fallbackFileName(12)).toBe('stride-review-copy-12.pdf')
  })
})
