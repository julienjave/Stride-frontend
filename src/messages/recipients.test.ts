import { describe, expect, it } from 'vitest'
import { ALEX, BLAKE, member, SAM } from '@/team/testData'
import type { User } from '@/users/types'
import { recipientsFromPatients, recipientsFromTeam } from './recipients'

// Only the fields the function reads; the rest of a User doesn't matter here.
const patient = (id: number, firstName: string, lastName: string) =>
  ({ id, firstName, lastName, avatarUrl: `https://example.com/${id}.jpg` }) as User

describe('recipientsFromPatients', () => {
  it('lists my patients by last name, with no specialties', () => {
    expect(recipientsFromPatients([patient(7, 'Zoe', 'Young'), patient(6, 'Pat', 'Lee')])).toEqual([
      { id: 6, firstName: 'Pat', lastName: 'Lee', avatarUrl: 'https://example.com/6.jpg', specialties: [] },
      { id: 7, firstName: 'Zoe', lastName: 'Young', avatarUrl: 'https://example.com/7.jpg', specialties: [] },
    ])
  })
})

describe('recipientsFromTeam', () => {
  it('lists the CURRENT members only, with their specialties', () => {
    const recipients = recipientsFromTeam([
      member(ALEX, { practitioner: { specialties: ['Knee rehabilitation'] } }),
      member(SAM, { isActive: false, endsAt: '2031-04-01T00:00:00.000Z' }),
      member(BLAKE),
    ])
    expect(recipients.map((r) => [r.firstName, r.specialties])).toEqual(
      expect.arrayContaining([
        ['Alex', ['Knee rehabilitation']],
        ['Blake', []],
      ]),
    )
    expect(recipients.map((r) => r.id)).not.toContain(SAM.id)
  })
})