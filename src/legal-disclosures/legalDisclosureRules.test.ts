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
  describeDisclosure,
  EMPTY_FORM,
  FORM_MESSAGES,
  formErrors,
  LEGAL_BASES,
  LEGAL_BASIS_LABELS,
  legalBasisText,
  makeBody,
  partsText,
  periodText,
  recipientText,
  sharedHeading,
  type DisclosureForm,
} from './legalDisclosureRules'
import type { LegalDisclosureSummary } from './types'

// The legal disclosure's words and form rules (decisions §25, pass 3). en-GB
// and UTC pin the moments ("28 Oct 2031, 14:05"); en-US the days ("March 1,
// 2031"). Far from today (2031).
const L = 'en-GB'
const Z = 'UTC'
const ME = 1
const TODAY = '2031-10-28'
const AVERY = { id: ME, firstName: 'Avery', lastName: 'Admin' }
const OLIVE = { id: 2, firstName: 'Olive', lastName: 'Other' }

function disclosure(extra: Partial<LegalDisclosureSummary> = {}): LegalDisclosureSummary {
  return {
    id: 21,
    madeAt: '2031-10-28T14:05:00.000Z',
    recipientName: 'Jane Roe',
    recipientOrganisation: 'Montreal Police',
    legalBasis: 'court_order',
    basisExplanation: null,
    parts: ['medical_file', 'messages'],
    periodFrom: null,
    periodTo: null,
    madeBy: AVERY,
    orderReference: '500-17-123',
    receivedOn: '2031-10-27',
    withheldUntil: null,
    shownToPatient: true,
    withholdingStatement: null,
    ...extra,
  }
}

// A form that passes every rule — each test breaks one thing.
const FILLED: DisclosureForm = {
  ...EMPTY_FORM,
  recipientName: 'Jane Roe',
  legalBasis: 'court_order',
  receivedOn: TODAY,
  parts: ['messages'],
}

describe('words', () => {
  it('says each basis, and "other" with its explanation', () => {
    expect(LEGAL_BASES.map((basis) => LEGAL_BASIS_LABELS[basis])).toStrictEqual([
      'A court order',
      'A subpoena, with the assurances the law requires',
      'Required by law',
      'A request from law enforcement',
      'A health oversight agency (an inspection or licensing body)',
      'A coroner or medical examiner',
      'Another legal basis',
    ])
    expect(legalBasisText('other', 'A tribunal order')).toBe('Another legal basis: A tribunal order')
    expect(legalBasisText('coroner', null)).toBe('A coroner or medical examiner')
  })

  it('says the parts as a phrase, in the fixed order', () => {
    expect(partsText(['messages'])).toBe('Messages')
    expect(partsText(['messages', 'medical_file'])).toBe('Medical file and messages')
    expect(partsText(['sessions', 'programs', 'messages', 'medical_file'])).toBe(
      'Medical file, exercise programs, sessions and messages',
    )
  })

  it('says the period in each of its shapes, the stored days kept', () => {
    expect(periodText('2031-03-01', '2031-03-31', 'en-US')).toBe('March 1, 2031 to March 31, 2031')
    expect(periodText('2031-03-01', '2031-03-01', 'en-US')).toBe('March 1, 2031')
    expect(periodText('2031-03-01', null, 'en-US')).toBe('from March 1, 2031')
    expect(periodText(null, '2031-03-31', 'en-US')).toBe('up to March 31, 2031')
    expect(periodText(null, null, 'en-US')).toBe('all dates')
  })

  it('names the recipient with their organisation, or alone', () => {
    expect(recipientText(disclosure())).toBe('Jane Roe (Montreal Police)')
    expect(recipientText(disclosure({ recipientOrganisation: null }))).toBe('Jane Roe')
  })

  it("heads the patient's line with the day and the recipient", () => {
    // Noon UTC: the same day in every zone the tests run in.
    expect(sharedHeading(disclosure({ madeAt: '2031-10-28T12:00:00.000Z' }), 'en-US')).toBe(
      'October 28, 2031 · Jane Roe (Montreal Police)',
    )
  })
})

describe('describeDisclosure', () => {
  it('says who made it and when — no hold line without a hold', () => {
    expect(describeDisclosure(disclosure(), ME, 'Pat', L, Z)).toStrictEqual({
      made: 'Made by you on 28 Oct 2031, 14:05.',
      hold: null,
    })
    expect(describeDisclosure(disclosure({ madeBy: OLIVE }), ME, 'Pat', L, Z).made).toBe(
      'Made by Olive Other on 28 Oct 2031, 14:05.',
    )
  })

  it("says a hold's day, and whether the patient sees it yet — by the server's word", () => {
    const held = disclosure({ withheldUntil: '2031-11-30T00:00:00.000Z', shownToPatient: false })
    expect(describeDisclosure(held, ME, 'Pat', L, Z).hold).toBe(
      "Held back from Pat until 30 November 2031, at an agency's request. They don't see it yet.",
    )
    expect(describeDisclosure({ ...held, shownToPatient: true }, ME, 'Pat', L, Z).hold).toBe(
      "Held back from Pat until 30 November 2031, at an agency's request — shown to them since.",
    )
    // The day in the viewer's zone: midnight UTC is still the 29th in
    // Montreal.
    expect(describeDisclosure(held, ME, 'Pat', L, 'America/Montreal').hold).toContain(
      'until 29 November 2031',
    )
  })
})

describe('formErrors', () => {
  it('finds nothing wrong with a complete form', () => {
    expect(formErrors(FILLED, TODAY)).toStrictEqual({})
  })

  it('asks for every required field of an empty form, in the form’s order', () => {
    expect(formErrors(EMPTY_FORM, TODAY)).toStrictEqual({
      recipientName: FORM_MESSAGES.recipientName,
      legalBasis: FORM_MESSAGES.legalBasis,
      receivedOn: FORM_MESSAGES.receivedOnMissing,
      parts: FORM_MESSAGES.parts,
    })
    expect(Object.keys(formErrors(EMPTY_FORM, TODAY))).toStrictEqual([
      'recipientName',
      'legalBasis',
      'receivedOn',
      'parts',
    ])
  })

  it('refuses a recipient of spaces', () => {
    expect(formErrors({ ...FILLED, recipientName: '   ' }, TODAY)).toStrictEqual({
      recipientName: FORM_MESSAGES.recipientName,
    })
  })

  it('asks for an explanation with "other" only', () => {
    expect(formErrors({ ...FILLED, legalBasis: 'other' }, TODAY)).toStrictEqual({
      basisExplanation: FORM_MESSAGES.basisExplanation,
    })
    expect(
      formErrors({ ...FILLED, legalBasis: 'other', basisExplanation: ' ' }, TODAY),
    ).toStrictEqual({ basisExplanation: FORM_MESSAGES.basisExplanation })
    expect(formErrors({ ...FILLED, legalBasis: 'other', basisExplanation: 'Why' }, TODAY)).toStrictEqual(
      {},
    )
  })

  it('refuses a request received after today — today itself is fine', () => {
    expect(formErrors({ ...FILLED, receivedOn: '2031-10-29' }, TODAY)).toStrictEqual({
      receivedOn: FORM_MESSAGES.receivedOnFuture,
    })
  })

  it('refuses a period that ends before it starts — a one-day period is fine', () => {
    expect(
      formErrors({ ...FILLED, periodFrom: '2031-03-02', periodTo: '2031-03-01' }, TODAY),
    ).toStrictEqual({ periodTo: FORM_MESSAGES.periodTo })
    expect(
      formErrors({ ...FILLED, periodFrom: '2031-03-01', periodTo: '2031-03-01' }, TODAY),
    ).toStrictEqual({})
  })

  it('asks for a hold’s day — after today — and its statement, only when holding', () => {
    expect(formErrors({ ...FILLED, hold: true }, TODAY)).toStrictEqual({
      withheldUntil: FORM_MESSAGES.withheldUntilMissing,
      withholdingStatement: FORM_MESSAGES.withholdingStatement,
    })
    expect(
      formErrors({ ...FILLED, hold: true, withheldUntil: TODAY, withholdingStatement: 'x' }, TODAY),
    ).toStrictEqual({ withheldUntil: FORM_MESSAGES.withheldUntilPast })
    expect(
      formErrors(
        { ...FILLED, hold: true, withheldUntil: '2031-10-29', withholdingStatement: 'x' },
        TODAY,
      ),
    ).toStrictEqual({})
    // Fields typed, then the hold unticked: nothing to check.
    expect(formErrors({ ...FILLED, withheldUntil: TODAY }, TODAY)).toStrictEqual({})
  })

  it('shows no message twice as its placeholder would', () => {
    // Each message differs from every placeholder the form shows.
    for (const message of Object.values(FORM_MESSAGES)) {
      expect(message).not.toMatch(/^e\.g\./)
    }
  })
})

describe('makeBody', () => {
  it('sends the required fields, the parts in order, and the zone', () => {
    expect(
      makeBody({ ...FILLED, parts: ['messages', 'medical_file'] }, 'Europe/Paris'),
    ).toStrictEqual({
      recipientName: 'Jane Roe',
      legalBasis: 'court_order',
      receivedOn: TODAY,
      parts: ['medical_file', 'messages'],
      timeZone: 'Europe/Paris',
    })
  })

  it('trims every text and leaves an empty optional one out', () => {
    expect(
      makeBody(
        {
          ...FILLED,
          recipientName: '  Jane Roe ',
          recipientOrganisation: ' Montreal Police ',
          orderReference: '   ',
          periodFrom: '2031-03-01',
          periodTo: '',
        },
        'UTC',
      ),
    ).toStrictEqual({
      recipientName: 'Jane Roe',
      recipientOrganisation: 'Montreal Police',
      legalBasis: 'court_order',
      receivedOn: TODAY,
      parts: ['messages'],
      periodFrom: '2031-03-01',
      timeZone: 'UTC',
    })
  })

  it('sends the explanation only with "other", the hold only when holding', () => {
    const typed = {
      ...FILLED,
      basisExplanation: ' Why ',
      orderReference: 'R-1',
      withheldUntil: '2031-11-30',
      withholdingStatement: ' Investigation ',
    }
    expect(makeBody(typed, 'UTC')).toStrictEqual({
      recipientName: 'Jane Roe',
      legalBasis: 'court_order',
      orderReference: 'R-1',
      receivedOn: TODAY,
      parts: ['messages'],
      timeZone: 'UTC',
    })
    expect(makeBody({ ...typed, legalBasis: 'other', hold: true }, 'UTC')).toStrictEqual({
      recipientName: 'Jane Roe',
      legalBasis: 'other',
      basisExplanation: 'Why',
      orderReference: 'R-1',
      receivedOn: TODAY,
      parts: ['messages'],
      withheldUntil: '2031-11-30',
      withholdingStatement: 'Investigation',
      timeZone: 'UTC',
    })
  })
})
