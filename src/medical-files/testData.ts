import type { MedicalFileEntry } from './types'

// Shared fixtures of the medical file tests — the shape the backend answers
// (GET /medical-files, a seeded chain like Pat's). Dates far from today
// (2031), the project's rule for test clocks.

export const ALEX = { id: 3, firstName: 'Alex', lastName: 'Chen' }
export const SAM = { id: 4, firstName: 'Sam', lastName: 'Okafor' }

export function entry(id: number, fields: Partial<MedicalFileEntry> = {}): MedicalFileEntry {
  return {
    id,
    patientId: 6,
    entryType: 'progress_note',
    subjective: null,
    objective: null,
    assessment: null,
    plan: `Plan of entry ${id}`,
    createdAt: '2031-03-04T10:00:00.000Z',
    author: ALEX,
    amendsId: null,
    amendmentReason: null,
    amendedById: null,
    ...fields,
  }
}

// A file like the seed's, newest first: an initial assessment (1); a
// progress note (2) amended by 3, itself amended by 4 — a chain of three
// versions; and a short note (5), the newest.
export function chainedFile(): MedicalFileEntry[] {
  return [
    entry(5, { createdAt: '2031-03-20T09:00:00.000Z', subjective: 'Sharp pain', plan: 'Stop short' }),
    entry(4, {
      createdAt: '2031-03-12T11:00:00.000Z',
      objective: 'Right knee flexion 125°',
      amendsId: 3,
      amendmentReason: 'Measured again',
    }),
    entry(3, {
      createdAt: '2031-03-11T11:00:00.000Z',
      objective: 'Right knee flexion 120°',
      amendsId: 2,
      amendmentReason: 'Wrong knee recorded',
      amendedById: 4,
    }),
    entry(2, {
      createdAt: '2031-03-11T09:00:00.000Z',
      objective: 'Left knee flexion 120°',
      amendedById: 3,
    }),
    entry(1, {
      entryType: 'initial_assessment',
      createdAt: '2031-03-01T09:00:00.000Z',
      subjective: 'Knee pain for 3 months',
      objective: 'Flexion 110°',
      assessment: 'Patellofemoral pain',
      plan: 'Knee Rehab, 3 days a week',
      author: SAM,
    }),
  ]
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}