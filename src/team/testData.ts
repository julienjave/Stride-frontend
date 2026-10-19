import type { AssignedProgramListItem } from '@/assigned-programs/types'
import type { Clinic } from '@/clinics/types'
import type { MyCareTeamEntry } from './types'

// Shared fixtures of the Team pages' tests — the shape the backend sends a
// PATIENT (no `reason`). Dates far from today (2031), the project's rule
// for test clocks.

export const PAT = {
  id: 6,
  firstName: 'Pat',
  lastName: 'Lee',
  email: 'pat@example.com',
  avatarUrl: null,
  roles: ['patient'],
  activeRole: 'patient',
  preferredWeightUnit: 'kg',
}

export const RIVERSIDE = { id: 1, name: 'Riverside Physio' }
export const HARBOUR = { id: 2, name: 'Harbour Sports Clinic' }

export const ALEX = { id: 3, firstName: 'Alex', lastName: 'Chen' }
export const SAM = { id: 4, firstName: 'Sam', lastName: 'Okafor' }
export const BLAKE = { id: 5, firstName: 'Blake', lastName: 'Martin' }
export const AVERY = { id: 1, firstName: 'Avery', lastName: 'Admin' }

type Person = typeof ALEX

// One link of Pat's team. Active, open-ended, joined by the practitioner
// themselves, at Riverside — each test changes what it is about.
export function member(
  practitioner: Person,
  fields: Partial<Omit<MyCareTeamEntry, 'practitioner'>> & {
    practitioner?: Partial<MyCareTeamEntry['practitioner']>
  } = {},
): MyCareTeamEntry {
  const { practitioner: overrides, ...rest } = fields
  return {
    id: practitioner.id * 100,
    patientId: PAT.id,
    practitioner: {
      ...practitioner,
      avatarUrl: null,
      specialties: [],
      bio: null,
      ...overrides,
    },
    sharedClinics: [RIVERSIDE],
    startedAt: '2031-03-02T10:00:00.000Z',
    endsAt: null,
    isActive: true,
    createdBy: practitioner,
    endedBy: null,
    ...rest,
  }
}

export function clinic(ref: { id: number; name: string }, fields: Partial<Clinic> = {}): Clinic {
  return {
    ...ref,
    email: `contact@clinic${ref.id}.example`,
    phone: null,
    website: null,
    logoUrl: null,
    isActive: true,
    addressLine1: null,
    addressLine2: null,
    addressCity: null,
    addressState: null,
    addressPostalCode: null,
    addressCountry: null,
    ...fields,
  }
}

export function program(id: number, fields: Partial<AssignedProgramListItem> = {}): AssignedProgramListItem {
  return {
    id,
    patientId: PAT.id,
    assignedBy: ALEX.id,
    basedOnTemplateId: null,
    basedOnProgramId: null,
    title: `Program ${id}`,
    startDate: '2031-06-02',
    endDate: null,
    status: 'active',
    isArchived: false,
    allowSwaps: false,
    lateMakeUpDays: null,
    schedules: [],
    assigner: ALEX,
    workouts: [],
    ...fields,
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

export function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}