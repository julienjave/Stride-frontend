import { apiRequest } from '@/api/client'
import type { AssignedProgram, AssignedProgramDetail } from './types'

export const assignedProgramsListQueryKey = ['assigned-programs-list'] as const

// No client-side ownership filtering needed here, unlike programs'
// canModifyProgram — AssignedProgramsService.findAllForCurrentUser
// already scopes this server-side per role (a practitioner only ever
// gets back assigned programs belonging to patients they actually
// manage), so every item this returns is already something the
// requesting practitioner can act on.
export function fetchAssignedPrograms() {
  return apiRequest<AssignedProgram[]>('/assigned-programs')
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