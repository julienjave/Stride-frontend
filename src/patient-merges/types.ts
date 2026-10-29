import type { PersonRef } from '@/invitations/types'

// One merge, as GET /patient-merges lists it (admins — decisions §27): the
// account merged AWAY (`mergedId`, deactivated for good), the account that
// kept everything (`survivorId`), when and by whom. An instant (ISO).
export interface PatientMerge {
  id: number
  mergedId: number
  survivorId: number
  mergedAt: string
  mergedBy: PersonRef
}

// What POST /users/:id/merge answers: which merge, which two accounts —
// never what moved (those ids are clinical, and withheld from admins).
export interface PatientMergeAnswer {
  mergeId: number
  mergedId: number
  survivorId: number
}
