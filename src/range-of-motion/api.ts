import { apiRequest } from '@/api/client'
import type { MovementCatalogue, NewRomAssessment, RomAssessment } from './types'

// --- QUERY KEYS --------------------------------------------------------------

// One patient's assessments: ['range-of-motion', patientId] — the shape of
// medicalFileQueryKey (the patient's own section and the practitioner's
// page use the same key; each signed-in role has its own cache). One
// assessment (the amend page) sits under that prefix, so invalidating the
// list refreshes it too.
export function rangeOfMotionQueryKey(patientId: number) {
  return ['range-of-motion', patientId] as const
}

export function romAssessmentQueryKey(patientId: number, assessmentId: number) {
  return ['range-of-motion', patientId, 'assessment', assessmentId] as const
}

// The catalogue: the same for everyone, and it changes only with a new
// backend — a key of its own, OUTSIDE the patients' prefix.
export const movementCatalogueQueryKey = ['range-of-motion-movements'] as const

// --- QUERIES -----------------------------------------------------------------

// The fixed list of movements (not audited: it is no one's data).
export function fetchMovementCatalogue() {
  return apiRequest<MovementCatalogue>('/range-of-motion/movements')
}

// A practitioner names the patient (?patientId=); a patient asks for their
// own with no parameter (the backend takes them from the session). Every
// call is an audited READ (ROM_VIEWED, with the assessments shown) — so,
// like the medical file, only a page that SHOWS them asks.
export function fetchRangeOfMotion(patientId: number | 'mine') {
  return apiRequest<RomAssessment[]>(
    patientId === 'mine' ? '/range-of-motion' : `/range-of-motion?patientId=${patientId}`,
  )
}

// One assessment (ROM_ASSESSMENT_VIEWED) — the version an amendment starts
// from. A hidden or missing one is a 404; the backend doesn't say which.
export function fetchRomAssessment(assessmentId: number) {
  return apiRequest<RomAssessment>(`/range-of-motion/${assessmentId}`)
}

// --- MUTATIONS ---------------------------------------------------------------

export function createRomAssessment(body: NewRomAssessment) {
  return apiRequest<RomAssessment>('/range-of-motion', { method: 'POST', body })
}