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