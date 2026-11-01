import { patientPagePath } from '@/medical-files/medicalFilePaths'

// Range of motion's addresses, written once (medicalFilePaths.ts's shape):
// a link and the route it matches can't drift apart.

export function rangeOfMotionPath(patientId: number): string {
  return `${patientPagePath(patientId)}/range-of-motion`
}

// The form: a new assessment, an AMENDMENT of one version (`amends`), or a
// new assessment with the visit's note already chosen (`note` — "Record
// measurements for this visit", from a medical file entry).
export function romAssessmentPath(
  patientId: number,
  options: { amends?: number; note?: number } = {},
): string {
  const path = `${rangeOfMotionPath(patientId)}/new`
  const query = new URLSearchParams()
  if (options.amends !== undefined) query.set('amends', String(options.amends))
  if (options.note !== undefined) query.set('note', String(options.note))
  const search = query.toString()
  return search === '' ? path : `${path}?${search}`
}