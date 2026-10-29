import { describe, expect, it } from 'vitest'
import type { User } from '@/users/types'
import {
  candidateLabel,
  DEACTIVATED_CANNOT_STAY_MESSAGE,
  keepRefusal,
  mergeCandidates,
  mergeOf,
  STAFF_CANNOT_GO_MESSAGE,
} from './mergeRules'
import type { PatientMerge } from './types'

function person(fields: Partial<User> & { id: number }): User {
  return {
    email: `u${fields.id}@example.com`,
    firstName: 'Pat',
    lastName: 'Lee',
    avatarUrl: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    addressCity: null,
    addressState: null,
    addressPostalCode: null,
    addressCountry: null,
    isActive: true,
    createdAt: '2031-01-01T00:00:00.000Z',
    mfaEnabled: false,
    preferredWeightUnit: 'kg',
    roles: ['patient'],
    patientProfile: { dateOfBirth: '1988-04-12' },
    clinics: [],
    ...fields,
  }
}

const merge = (mergedId: number, survivorId: number): PatientMerge => ({
  id: mergedId * 10,
  mergedId,
  survivorId,
  mergedAt: '2031-06-10T12:00:00.000Z',
  mergedBy: { id: 1, firstName: 'Avery', lastName: 'Admin' },
})

describe('mergeOf', () => {
  it('finds the merge that took this account away — not one it survived', () => {
    const merges = [merge(5, 2), merge(2, 9)]
    expect(mergeOf(merges, 5)).toBe(merges[0])
    expect(mergeOf(merges, 9)).toBeUndefined()
  })
})

describe('mergeCandidates', () => {
  it('offers the other patient accounts not merged away, by last name, first name, id', () => {
    const users = [
      person({ id: 1 }),
      person({ id: 4, lastName: 'Adams' }),
      person({ id: 3 }),
      // Ann's id is the highest: only the first-name order puts her first.
      person({ id: 8, firstName: 'Ann' }),
      person({ id: 6, roles: ['practitioner'] }),
      person({ id: 7 }),
    ]
    expect(mergeCandidates(users, [merge(7, 1)], 1).map((user) => user.id)).toStrictEqual([
      4, 8, 3,
    ])
  })
})

describe('keepRefusal', () => {
  it('lets an active account be kept while a patient-only one goes', () => {
    expect(keepRefusal(person({ id: 1 }), person({ id: 2 }))).toBeNull()
  })

  it('refuses to merge away an account that is also staff', () => {
    expect(
      keepRefusal(person({ id: 1 }), person({ id: 2, roles: ['patient', 'admin'] })),
    ).toBe(STAFF_CANNOT_GO_MESSAGE)
  })

  it('refuses to keep a deactivated account', () => {
    expect(keepRefusal(person({ id: 1, isActive: false }), person({ id: 2 }))).toBe(
      DEACTIVATED_CANNOT_STAY_MESSAGE,
    )
  })
})

describe('candidateLabel', () => {
  it('tells two namesakes apart — email, birth date, and whether deactivated', () => {
    expect(candidateLabel(person({ id: 1 }))).toBe('Pat Lee · u1@example.com · born 1988-04-12')
    expect(candidateLabel(person({ id: 2, isActive: false, patientProfile: undefined }))).toBe(
      'Pat Lee · u2@example.com · deactivated',
    )
  })
})
