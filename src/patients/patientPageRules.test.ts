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

import { describe, it, expect } from 'vitest'
import type { AssignedProgram } from '@/assigned-programs/types'
import {
  PROGRAM_STATUS_LABELS,
  endOfLocalDay,
  filterCandidates,
  isOnlyActiveMember,
  programRowSummary,
  sortCareTeam,
  splitProgramsForPatientPage,
} from './patientPageRules'
import type { CareTeamEntry } from './types'

function program(
  id: number,
  status: AssignedProgram['status'],
  startDate: string,
  endDate: string | null = null,
): AssignedProgram {
  return {
    id,
    patientId: 6,
    assignedBy: 2,
    basedOnTemplateId: null,
    basedOnProgramId: null,
    title: `Program ${id}`,
    startDate,
    endDate,
    status,
    isArchived: false,
    allowSwaps: true,
    lateMakeUpDays: null,
    schedules: [],
  }
}

function entry(
  practitionerId: number,
  isActive: boolean,
  startedAt: string,
  endsAt: string | null = null,
): CareTeamEntry {
  return {
    id: practitionerId * 10,
    patientId: 6,
    practitioner: {
      id: practitionerId,
      firstName: 'P',
      lastName: `${practitionerId}`,
      avatarUrl: null,
      specialties: [],
      bio: null,
    },
    sharedClinics: [],
    startedAt,
    endsAt,
    isActive,
    reason: null,
    createdBy: null,
    endedBy: null,
  }
}

describe('splitProgramsForPatientPage', () => {
  const ids = (programs: AssignedProgram[]) => programs.map((p) => p.id)

  it('keeps active programs current and puts completed AND cancelled ones in the past', () => {
    const { current, past } = splitProgramsForPatientPage([
      program(1, 'completed', '2026-01-01', '2026-02-01'),
      program(2, 'active', '2026-03-01'),
      program(3, 'cancelled', '2026-05-01', '2026-05-20'),
    ])
    expect(ids(current)).toEqual([2])
    expect(ids(past).sort()).toEqual([1, 3])
  })

  it('keeps an ACTIVE program current even after its end date — nobody has closed it yet', () => {
    // Ended in 2026 — long before any test runs: the split ignores dates.
    const { current, past } = splitProgramsForPatientPage([
      program(1, 'active', '2026-01-01', '2026-01-31'),
    ])
    expect(ids(current)).toEqual([1])
    expect(past).toEqual([])
  })

  it('orders current programs by start, the most recent first', () => {
    const { current } = splitProgramsForPatientPage([
      program(1, 'active', '2026-03-01'),
      program(2, 'active', '2026-06-01'),
      program(3, 'active', '2026-04-01'),
    ])
    expect(ids(current)).toEqual([2, 3, 1])
  })

  it('orders past programs by END, the most recent first — completed and cancelled mixed', () => {
    // Start order and end order DISAGREE here: 1 started last but ended
    // first; sorting the past by start would give 1, 3, 2.
    const { past } = splitProgramsForPatientPage([
      program(1, 'completed', '2026-06-01', '2026-06-10'),
      program(2, 'cancelled', '2026-02-01', '2026-09-01'),
      program(3, 'completed', '2026-03-01', '2026-08-01'),
    ])
    expect(ids(past)).toEqual([2, 3, 1])
  })

  it('breaks a tie on the end date with the start, the most recent first', () => {
    const { past } = splitProgramsForPatientPage([
      program(1, 'completed', '2026-01-01', '2026-05-01'),
      program(2, 'cancelled', '2026-04-01', '2026-05-01'),
    ])
    expect(ids(past)).toEqual([2, 1])
  })

  it('puts a past program without an end date last instead of crashing', () => {
    const { past } = splitProgramsForPatientPage([
      program(1, 'cancelled', '2026-09-01', null),
      program(2, 'completed', '2026-01-01', '2026-02-01'),
    ])
    expect(ids(past)).toEqual([2, 1])
  })

  it('leaves the input alone', () => {
    const programs = [
      program(1, 'active', '2026-01-01'),
      program(2, 'active', '2026-02-01'),
    ]
    splitProgramsForPatientPage(programs)
    expect(ids(programs)).toEqual([1, 2])
  })
})

describe('programRowSummary', () => {
  // The locale pinned, so the expected strings can be written out in full.
  const summary = (p: AssignedProgram) => programRowSummary(p, 'en-US')

  it('gives a current program its span, then its status', () => {
    expect(summary(program(1, 'active', '2026-09-01', '2026-12-01'))).toBe(
      'September 1, 2026 – December 1, 2026 · Active',
    )
  })

  it('says when an open-ended program started', () => {
    expect(summary(program(1, 'active', '2026-09-01'))).toBe('Started September 1, 2026 · Active')
  })

  it('leads a past program with how it ended, then when it ended and started', () => {
    expect(summary(program(1, 'cancelled', '2026-09-12', '2026-10-03'))).toBe(
      'Cancelled · ended October 3, 2026 · ran from September 12, 2026',
    )
    expect(summary(program(2, 'completed', '2026-01-05', '2026-03-29'))).toBe(
      'Completed · ended March 29, 2026 · ran from January 5, 2026',
    )
  })

  it('never says "ended null" for a past program without an end date', () => {
    expect(summary(program(1, 'cancelled', '2026-09-12'))).toBe(
      'Cancelled · started September 12, 2026',
    )
  })
})

describe('PROGRAM_STATUS_LABELS', () => {
  it('has a readable label for every status', () => {
    expect(PROGRAM_STATUS_LABELS).toEqual({
      active: 'Active',
      completed: 'Completed',
      cancelled: 'Cancelled',
    })
  })
})

describe('sortCareTeam', () => {
  it('lists current members longest-serving first, then past ones most recently ended first', () => {
    const sorted = sortCareTeam([
      entry(1, false, '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z'),
      entry(2, true, '2026-05-01T00:00:00Z'),
      entry(3, false, '2026-01-01T00:00:00Z', '2026-04-01T00:00:00Z'),
      entry(4, true, '2026-03-01T00:00:00Z'),
    ])
    expect(sorted.map((e) => e.practitioner.id)).toEqual([4, 2, 3, 1])
  })
})

describe('isOnlyActiveMember', () => {
  it('is true only when I am the one current member', () => {
    expect(isOnlyActiveMember([entry(2, true, '2026-01-01T00:00:00Z')], 2)).toBe(true)
    // Past members don't count: they have no access.
    expect(
      isOnlyActiveMember(
        [entry(2, true, '2026-01-01T00:00:00Z'), entry(3, false, '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z')],
        2,
      ),
    ).toBe(true)
  })

  it('is false when someone else is on the team too, or when the one member is not me', () => {
    expect(
      isOnlyActiveMember(
        [entry(2, true, '2026-01-01T00:00:00Z'), entry(3, true, '2026-01-01T00:00:00Z')],
        2,
      ),
    ).toBe(false)
    expect(isOnlyActiveMember([entry(3, true, '2026-01-01T00:00:00Z')], 2)).toBe(false)
  })
})

describe('endOfLocalDay', () => {
  it("is the last moment of that day in the viewer's time zone", () => {
    const moment = new Date(endOfLocalDay('2026-10-16'))
    // Read back in LOCAL time (whatever zone the machine is in): still the
    // 16th, at 23:59:59.999 — the cover lasts the whole chosen day.
    expect([moment.getFullYear(), moment.getMonth() + 1, moment.getDate()]).toEqual([2026, 10, 16])
    expect([moment.getHours(), moment.getMinutes(), moment.getSeconds(), moment.getMilliseconds()]).toEqual([
      23, 59, 59, 999,
    ])
  })

  it('is sent as a UTC ISO string', () => {
    expect(endOfLocalDay('2026-10-16')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})


describe('filterCandidates', () => {
  const sam = { firstName: 'Sam', lastName: 'Okafor', specialties: ['Sports'] }
  const emile = { firstName: 'Émile', lastName: 'Durand', specialties: ['Vestibular rehab'] }

  it('keeps everyone for an empty or blank text', () => {
    expect(filterCandidates([sam, emile], '  ')).toEqual([sam, emile])
  })

  it('matches first name, last name, full name or a specialty', () => {
    expect(filterCandidates([sam, emile], 'okafor')).toEqual([sam])
    expect(filterCandidates([sam, emile], 'Sam Ok')).toEqual([sam])
    expect(filterCandidates([sam, emile], 'vestib')).toEqual([emile])
  })

  it('ignores case and accents', () => {
    expect(filterCandidates([sam, emile], 'EMILE')).toEqual([emile])
    expect(filterCandidates([sam, emile], 'émi')).toEqual([emile])
  })
})