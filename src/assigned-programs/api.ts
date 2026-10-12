import { apiRequest } from '@/api/client'
import type {
  AssignedProgramDetail,
  AssignedProgramListItem,
  CreateAssignedProgramInput,
} from './types'

export const assignedProgramsListQueryKey = ['assigned-programs-list'] as const

// One patient's programs (the patient page). It STARTS WITH the list's key
// on purpose: anything that invalidates ['assigned-programs-list'] after
// changing a program (a prefix match) refreshes every patient's list too,
// with no extra line at each call site.
export function patientAssignedProgramsQueryKey(patientId: number) {
  return [...assignedProgramsListQueryKey, 'patient', patientId] as const
}

// One program in full (workouts, exercises, schedules) — the program page's
// entry. Its own top-level key, NOT under the list's: invalidating every
// list after a change must not also throw away the detail just written
// into the cache.
export function assignedProgramQueryKey(id: number) {
  return ['assigned-programs', id] as const
}

// No client-side ownership filtering needed here, unlike programs'
// canModifyProgram — AssignedProgramsService.findAllForCurrentUser
// already scopes this server-side per role (a practitioner only ever
// gets back assigned programs belonging to patients they actually
// manage), so every item this returns is already something the
// requesting practitioner can act on.
export function fetchAssignedPrograms() {
  return apiRequest<AssignedProgramListItem[]>('/assigned-programs')
}

// GET /assigned-programs?patientId= — EVERY program of one patient, whoever
// assigned it (the hub only ever shows your own). The backend allows it to
// the patient's care team, the patient and admins; anyone else gets a 403,
// never an empty list.
export function fetchPatientAssignedPrograms(patientId: number) {
  return apiRequest<AssignedProgramListItem[]>(`/assigned-programs?patientId=${patientId}`)
}

export function fetchAssignedProgram(id: number) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}`)
}

// Same two-step shape as programs' assignExerciseToProgram — sortOrder
// is a required field the backend doesn't compute for you, so the
// current exercise count has to be read first.
export async function assignExerciseToAssignedProgram(
  assignedProgramId: number,
  exerciseId: number,
) {
  const program = await fetchAssignedProgram(assignedProgramId)
  return apiRequest(`/assigned-programs/${assignedProgramId}/exercises`, {
    method: 'POST',
    body: { exerciseId, sortOrder: program.exercises.length },
  })
}

// POST /assigned-programs — assigns a program to a patient: the backend
// copies the template's workouts and exercises, creates the first schedule
// version, and writes the audit entry, all in one transaction. Answers with
// the full new program (the same shape as GET /assigned-programs/:id).
export function createAssignedProgram(input: CreateAssignedProgramInput) {
  return apiRequest<AssignedProgramDetail>('/assigned-programs', {
    method: 'POST',
    body: input,
  })
}