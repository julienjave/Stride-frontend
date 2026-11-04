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
import { findTeamMember, programsFrom, splitTeam, websiteHref } from './teamRules'
import { ALEX, BLAKE, SAM, member, program } from './testData'

const ids = (entries: { id: number }[]) => entries.map((entry) => entry.id)

describe('splitTeam', () => {
  it('lists the current members longest-serving first, and the past ones apart', () => {
    const alex = member(ALEX, { startedAt: '2031-03-02T10:00:00.000Z' })
    const sam = member(SAM, { startedAt: '2031-01-15T10:00:00.000Z' })
    const blake = member(BLAKE, { isActive: false, endsAt: '2031-02-01T10:00:00.000Z' })

    const { current, past } = splitTeam([alex, blake, sam])

    expect(ids(current)).toEqual([sam.id, alex.id])
    expect(ids(past)).toEqual([blake.id])
  })

  it("keeps a current member out of the past list, even with an earlier period", () => {
    const back = member(ALEX, { id: 2 })
    const before = member(ALEX, {
      id: 1,
      startedAt: '2031-01-02T10:00:00.000Z',
      endsAt: '2031-02-02T10:00:00.000Z',
      isActive: false,
    })

    const { current, past } = splitTeam([before, back])

    expect(ids(current)).toEqual([2])
    expect(past).toEqual([])
  })

  it('lists a past member once — their latest period — most recently ended first', () => {
    const samFirst = member(SAM, {
      id: 1,
      startedAt: '2031-01-02T10:00:00.000Z',
      endsAt: '2031-01-20T10:00:00.000Z',
      isActive: false,
    })
    const samLatest = member(SAM, {
      id: 2,
      startedAt: '2031-02-02T10:00:00.000Z',
      endsAt: '2031-04-20T10:00:00.000Z',
      isActive: false,
    })
    const blake = member(BLAKE, {
      id: 3,
      endsAt: '2031-03-10T10:00:00.000Z',
      isActive: false,
    })

    // Given in an order that is neither answer, so the sort is what decides.
    expect(ids(splitTeam([samFirst, blake, samLatest]).past)).toEqual([2, 3])
  })

  it("leaves the input as it was (it's cached data)", () => {
    const entries = [member(ALEX, { startedAt: '2031-05-01T10:00:00.000Z' }), member(SAM)]
    const before = ids(entries)
    splitTeam(entries)
    expect(ids(entries)).toEqual(before)
  })
})

describe('findTeamMember', () => {
  it('finds the ACTIVE link of a practitioner, and nothing for a past or unknown one', () => {
    const old = member(ALEX, { id: 1, isActive: false, endsAt: '2031-02-02T10:00:00.000Z' })
    const now = member(ALEX, { id: 2 })
    const gone = member(SAM, { id: 3, isActive: false, endsAt: '2031-02-02T10:00:00.000Z' })
    const entries = [old, now, gone]

    expect(findTeamMember(entries, ALEX.id)?.id).toBe(2)
    expect(findTeamMember(entries, SAM.id)).toBeUndefined()
    expect(findTeamMember(entries, BLAKE.id)).toBeUndefined()
  })
})

describe('programsFrom', () => {
  it("keeps this practitioner's programs: current ones, then past ones most recently ended first", () => {
    const programs = [
      program(1, { status: 'completed', endDate: '2031-04-01' }),
      program(2, { assignedBy: SAM.id, assigner: SAM }),
      program(3),
      program(4, { status: 'cancelled', endDate: '2031-05-01' }),
    ]

    const { current, past } = programsFrom(programs, ALEX.id)

    expect(ids(current)).toEqual([3])
    expect(ids(past)).toEqual([4, 1])
  })

  it('goes by who ASSIGNED the program, not by the joined name', () => {
    // A program whose assigner name is missing still belongs to them.
    expect(ids(programsFrom([program(7, { assigner: null })], ALEX.id).current)).toEqual([7])
  })
})

describe('websiteHref', () => {
  it.each([
    ['https://riverside.example', 'https://riverside.example'],
    ['HTTP://riverside.example/team', 'HTTP://riverside.example/team'],
    ['riverside.example', 'https://riverside.example'],
    ['  www.riverside.example/a:b  ', 'https://www.riverside.example/a:b'],
  ])('links %s to %s', (website, href) => {
    expect(websiteHref(website)).toBe(href)
  })

  it.each(['javascript:alert(1)', 'mailto:someone@example.com', '   '])(
    'gives no link for %s',
    (website) => {
      expect(websiteHref(website)).toBeNull()
    },
  )
})