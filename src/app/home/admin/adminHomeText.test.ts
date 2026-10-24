import { describe, it, expect } from 'vitest'
import type { AdminMetrics } from './api'
import { countOf, moreLine, nothingNeedsAttention, notCountedLine } from './adminHomeText'

function metrics(overrides: {
  deactivatedAccounts?: number
  deactivatedClinics?: number
  patients?: number
  practitioners?: number
}): AdminMetrics {
  const list = (total: number) => ({
    total,
    first: total > 0 ? [{ id: 1, firstName: 'A', lastName: 'B' }] : [],
  })
  return {
    accounts: { admins: 1, practitioners: 2, patients: 3, deactivated: overrides.deactivatedAccounts ?? 0 },
    clinics: { active: 1, deactivated: overrides.deactivatedClinics ?? 0 },
    pendingInvitations: 0,
    needsAttention: {
      patientsWithoutCareTeam: list(overrides.patients ?? 0),
      practitionersWithoutClinic: list(overrides.practitioners ?? 0),
    },
  }
}

describe('countOf', () => {
  it('uses the singular for exactly one, the plural otherwise (zero included)', () => {
    expect(countOf(1, 'clinic', 'clinics')).toBe('1 clinic')
    expect(countOf(2, 'clinic', 'clinics')).toBe('2 clinics')
    expect(countOf(0, 'clinic', 'clinics')).toBe('0 clinics')
  })
})

describe('notCountedLine', () => {
  it('names both kinds when both have some', () => {
    expect(notCountedLine(metrics({ deactivatedAccounts: 3, deactivatedClinics: 1 }))).toBe(
      'Not counted above: 3 deactivated accounts and 1 deactivated clinic.',
    )
  })

  it('names only the accounts when no clinic is deactivated', () => {
    expect(notCountedLine(metrics({ deactivatedAccounts: 1 }))).toBe(
      'Not counted above: 1 deactivated account.',
    )
  })

  it('names only the clinics when no account is deactivated', () => {
    expect(notCountedLine(metrics({ deactivatedClinics: 2 }))).toBe(
      'Not counted above: 2 deactivated clinics.',
    )
  })

  it('says nothing when nothing is deactivated', () => {
    expect(notCountedLine(metrics({}))).toBeNull()
  })
})

describe('moreLine', () => {
  const ada = { id: 1, firstName: 'Ada', lastName: 'Min' }

  it('counts the accounts beyond the listed ones', () => {
    expect(moreLine({ total: 7, first: [ada, ada, ada, ada, ada] })).toBe('and 2 more')
    expect(moreLine({ total: 6, first: [ada, ada, ada, ada, ada] })).toBe('and 1 more')
  })

  it('says nothing when everyone is listed', () => {
    expect(moreLine({ total: 1, first: [ada] })).toBeNull()
    expect(moreLine({ total: 0, first: [] })).toBeNull()
  })
})

describe('nothingNeedsAttention', () => {
  it('is true only when BOTH groups are empty', () => {
    expect(nothingNeedsAttention(metrics({}))).toBe(true)
    expect(nothingNeedsAttention(metrics({ patients: 1 }))).toBe(false)
    expect(nothingNeedsAttention(metrics({ practitioners: 1 }))).toBe(false)
  })
})