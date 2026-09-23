import { apiRequest } from '@/api/client'
import type { ProgramTemplate, ProgramTemplateDetail } from './types'
import type {
  CreateTemplateFormValues,
  AddTemplateExerciseFormValues,
} from './schemas'

// A distinct top-level key from a future programQueryKey(id), same
// reasoning as exercisesListQueryKey/exerciseQueryKey — a list and a
// detail entry must never share a top-level key, or invalidating one
// can silently undo a setQueryData just written to the other.
export const programsListQueryKey = ['programs-list'] as const

export function fetchPrograms() {
  return apiRequest<ProgramTemplate[]>('/programs')
}

// A distinct top-level key from programsListQueryKey — same reasoning as
// exercisesListQueryKey/exerciseQueryKey: a list and a detail entry must
// never share a top-level key, or invalidating one can silently undo a
// setQueryData just written to the other.
export function programQueryKey(id: number) {
  return ['program', id] as const
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

export function createTemplate(values: CreateTemplateFormValues) {
  return apiRequest<ProgramTemplate>('/programs', {
    method: 'POST',
    body: {
      title: values.title,
      // Empty string -> undefined (omitted from the request entirely),
      // not sent as-is — same established convention as
      // clinics/api.ts's createClinic for its own optional text fields
      // (phone/website). CreateTemplateDto's description is
      // @IsOptional(), and omitting the field entirely matches that
      // more accurately than sending an explicit empty string would.
      description: values.description === '' ? undefined : values.description,
    },
  })
}

// order is the full, reordered list of every existing row's own id
// (template_exercises.id, NOT exerciseId) — the backend validates this
// is an exact permutation of the template's current rows.
export function reorderTemplateExercises(templateId: number, order: number[]) {
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}/exercises`, {
    method: 'PATCH',
    body: { order },
  })
}

export function removeTemplateExercise(
  templateId: number,
  templateExerciseId: number,
) {
  return apiRequest<ProgramTemplateDetail>(
    `/programs/${templateId}/exercises/${templateExerciseId}`,
    { method: 'DELETE' },
  )
}

// Payload mirrors UpdateTemplateExerciseDto — every field independently
// optional, since each inline-editable field on the view/edit page
// PATCHes only the one field it owns, same convention as
// EditableExerciseListField/EditableExerciseTitle on the Library page.
export interface UpdateTemplateExercisePayload {
  sets?: number
  reps?: number
  durationInSeconds?: number
  weight?: number
  weightUnit?: 'kg' | 'lbs'
  notes?: string
}

export function updateTemplateExercise(
  templateId: number,
  templateExerciseId: number,
  payload: UpdateTemplateExercisePayload,
) {
  return apiRequest<ProgramTemplateDetail>(
    `/programs/${templateId}/exercises/${templateExerciseId}`,
    { method: 'PATCH', body: payload },
  )
}

// Same "fetch current count, then append" shape as
// assignExerciseToProgram — sortOrder is still a required field the
// backend doesn't compute for you. This is the richer sibling of that
// function: assignExerciseToProgram only ever sends {exerciseId,
// sortOrder} (the Assign flow's own simple "just add it" contract),
// while this one carries the full prescription (sets/reps/duration/
// weight/unit) the New Program Exercise screen actually collects.
export async function addTemplateExercise(
  templateId: number,
  exerciseId: number,
  values: AddTemplateExerciseFormValues,
) {
  const template = await fetchProgram(templateId)
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}/exercises`, {
    method: 'POST',
    body: {
      exerciseId,
      sets: values.sets,
      reps: values.reps,
      durationInSeconds: values.durationInSeconds,
      weight: values.weight,
      weightUnit: values.weightUnit,
      sortOrder: template.exercises.length,
    },
  })
}