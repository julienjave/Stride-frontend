import { describe, expect, it } from 'vitest'
import type { InvitationSummary } from '@/invitations/types'
import type { CareTeamEntry } from '@/patients/types'
import type { User } from '@/users/types'
import { comparedRows, differingLabels, invitationText, UNKNOWN } from './comparison'

const L = 'en-GB'

const pat: User = {
  id: 1,
  email: 'pat@example.com',
  firstName: 'Pat',
  lastName: 'Lee',
  avatarUrl: null,
  phone: '555-0101',
  addressLine1: '1 Quay St',
  addressLine2: null,
  addressCity: 'Springfield',
  addressState: null,
  addressPostalCode: '62704',
  addressCountry: 'US',
  isActive: true,
  createdAt: '2031-01-05T12:00:00.000Z',
  mfaEnabled: false,
  preferredWeightUnit: 'kg',
  messageEmailNotices: true,
  readableFont: false,
  roles: ['patient'],
  patientProfile: { dateOfBirth: '1988-04-12' },
  clinics: [{ id: 1, name: 'Riverside' }],
}

const alex = {
  practitioner: { firstName: 'Alex', lastName: 'Chen' },
} as unknown as CareTeamEntry

const invitation = (status: InvitationSummary['status']) =>
  ({ status }) as unknown as InvitationSummary

describe('invitationText', () => {
  it('reads the newest invitation, and says when there is none', () => {
    expect(invitationText([])).toBe('None')
    expect(invitationText([invitation('accepted'), invitation('expired')])).toBe(
      'Accepted — the account has a password',
    )
    expect(invitationText([invitation('pending')])).toBe('Sent, not accepted yet')
    expect(invitationText([invitation('expired')])).toBe('Expired, not accepted')
    expect(invitationText([invitation('revoked')])).toBe('Revoked')
  })
})

describe('comparedRows', () => {
  it('reads an account as identity only, every row filled', () => {
    expect(comparedRows(pat, [alex], [invitation('accepted')], L)).toStrictEqual([
      { label: 'Email', value: 'pat@example.com' },
      { label: 'Date of birth', value: '12 April 1988' },
      { label: 'Phone', value: '555-0101' },
      { label: 'Address', value: '1 Quay St, 62704 Springfield, United States' },
      { label: 'Clinics', value: 'Riverside' },
      { label: 'Care team', value: 'Alex Chen' },
      { label: 'Status', value: 'Active' },
      { label: 'Created', value: '5 January 2031' },
      { label: 'Invitation', value: 'Accepted — the account has a password' },
    ])
  })

  it('says None for what is missing, and — for what is not known yet', () => {
    const empty = {
      ...pat,
      phone: null,
      addressLine1: null,
      addressCity: null,
      addressPostalCode: null,
      addressCountry: null,
      clinics: [],
      isActive: false,
      patientProfile: undefined,
    }
    const values = comparedRows(empty, null, null, L).map((row) => row.value)
    expect(values).toStrictEqual([
      'pat@example.com',
      'None',
      'None',
      'None',
      'None',
      UNKNOWN,
      'Deactivated',
      '5 January 2031',
      UNKNOWN,
    ])
    expect(comparedRows(empty, [], [], L)[5].value).toBe('None')
  })
})

describe('differingLabels', () => {
  it('names the rows that differ — never Email or Created, which always do', () => {
    const left = comparedRows(pat, [alex], [], L)
    const right = comparedRows(
      { ...pat, id: 2, email: 'p2@example.com', phone: null, createdAt: '2031-02-01T12:00:00.000Z' },
      [alex],
      [],
      L,
    )
    expect(differingLabels(left, right)).toStrictEqual(['Phone'])
    expect(differingLabels(left, left)).toStrictEqual([])
    // A value not known on one side isn't a difference (yet).
    const unknown = comparedRows(pat, null, null, L)
    expect(differingLabels(left, unknown)).toStrictEqual([])
  })
})