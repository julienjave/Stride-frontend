import { describe, it, expect } from 'vitest'
import type { AssignedProgram } from '@/assigned-programs/types'
import {
  PROGRAM_STATUS_LABELS,
  isOnlyActiveMember,
  sortCareTeam,
  sortProgramsForPatientPage,
} from './patientPageRules'
import type { CareTeamEntry } from './types'

function program(
  id: number,
  status: AssignedProgram['status'],
  startDate: string,
): AssignedProgram {
  return {
    id,
    patientId: 6,
    assignedBy: 2,
    basedOnTemplateId: null,
    title: `Program ${id}`,
    startDate,
    endDate: null,
    status,
    isArchived: false,
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
    practitioner: { id: practitionerId, firstName: 'P', lastName: `${practitionerId}`, avatarUrl: null },
    startedAt,
    endsAt,
    isActive,
    reason: null,
    createdBy: null,
    endedBy: null,
  }
}

describe('sortProgramsForPatientPage', () => {
  it('puts current work first: active, on hold, then finished — newest first within each', () => {
    const sorted = sortProgramsForPatientPage([
      program(1, 'completed', '2026-01-01'),
      program(2, 'active', '2026-03-01'),
      program(3, 'cancelled', '2026-05-01'),
      program(4, 'on_hold', '2026-02-01'),
      program(5, 'active', '2026-06-01'),
      program(6, 'completed', '2026-04-01'),
    ])
    expect(sorted.map((p) => p.id)).toEqual([5, 2, 4, 6, 1, 3])
  })

  it('returns a new array', () => {
    const programs = [program(1, 'completed', '2026-01-01'), program(2, 'active', '2026-01-01')]
    expect(sortProgramsForPatientPage(programs)).not.toBe(programs)
    expect(programs.map((p) => p.id)).toEqual([1, 2])
  })
})

describe('PROGRAM_STATUS_LABELS', () => {
  it('has a readable label for every status', () => {
    expect(PROGRAM_STATUS_LABELS).toEqual({
      active: 'Active',
      on_hold: 'On hold',
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