import { apiRequest } from '@/api/client'
import type { ProgramTemplate, ProgramTemplateDetail } from './types'

// A distinct top-level key from a future programQueryKey(id), same
// reasoning as exercisesListQueryKey/exerciseQueryKey — a list and a
// detail entry must never share a top-level key, or invalidating one
// can silently undo a setQueryData just written to the other.
export const programsListQueryKey = ['programs-list'] as const

export function fetchPrograms() {
  return apiRequest<ProgramTemplate[]>('/programs')
}

export function fetchProgram(id: number) {
  return apiRequest<ProgramTemplateDetail>(`/programs/${id}`)
}

// Combines two real requests into one function: GET the target
// template's CURRENT exercise list (to compute where this exercise
// lands — sortOrder is a required field on the backend, not something
// it computes for you, per AddTemplateExerciseDto), then POST the add.
// Appending at the end (exercises.length) rather than asking the person
// to pick a position keeps the Assign flow exactly as simple as
// designed — a confirm dialog, not a full reordering UI; reordering
// within a template is that template's own future editing screen's job.
export async function assignExerciseToProgram(
  programId: number,
  exerciseId: number,
) {
  const program = await fetchProgram(programId)
  return apiRequest(`/programs/${programId}/exercises`, {
    method: 'POST',
    body: { exerciseId, sortOrder: program.exercises.length },
  })
}