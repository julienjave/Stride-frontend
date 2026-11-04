/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { apiRequest } from '@/api/client'
import { copyRequestBody, type CopyTarget } from '@/workouts/copyExercises'
import { nextExercisePosition } from '@/workouts/workoutGroups'
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

// The id of a template's first workout (A) — where an exercise goes when
// no workout is named (the backend's default too). `workouts` arrives in
// display order, and every template has at least one.
function firstWorkoutId(template: ProgramTemplateDetail): number {
  return template.workouts[0].id
}

// Combines two real requests into one function: GET the target
// template's CURRENT exercise list (to compute where this exercise
// lands — sortOrder is a required field on the backend, not something
// it computes for you, per AddTemplateExerciseDto), then POST the add.
// Appending at the end rather than asking the person to pick a position
// keeps the Assign flow exactly as simple as designed — a confirm dialog,
// not a full reordering UI.
//
// No workoutId is sent, so the backend puts it in the first workout (A);
// the position is the end of THAT workout (nextExercisePosition), not the
// whole template's count — positions restart at 0 in every workout, so
// the count would leave a gap in A, or even land before A's last exercise
// once removals have left gaps.
export async function assignExerciseToProgram(
  programId: number,
  exerciseId: number,
) {
  const program = await fetchProgram(programId)
  return apiRequest(`/programs/${programId}/exercises`, {
    method: 'POST',
    body: {
      exerciseId,
      sortOrder: nextExercisePosition(program.exercises, firstWorkoutId(program)),
    },
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

// Payload mirrors UpdateTemplateDto (PartialType of CreateTemplateDto) —
// each inline editor on TemplateDetailPage sends only the one field it
// owns. description allows an explicit null: that's how "clear the
// description" is expressed, since JSON.stringify silently DROPS keys
// whose value is undefined — sending { description: undefined } would
// arrive as an empty {} body and change nothing. null survives
// serialization, passes @IsOptional() on the backend, and is written as
// a real SQL NULL (verified by programs.e2e-spec.ts).
export interface UpdateTemplatePayload {
  title?: string
  description?: string | null
}

// Every one of these three returns the FULL enriched template (the
// backend's findOne shape) — so each caller can write the response
// straight into programQueryKey's cache entry without losing the
// exercises array.
export function updateTemplate(templateId: number, payload: UpdateTemplatePayload) {
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}`, {
    method: 'PATCH',
    body: payload,
  })
}

// DELETE, because that's the backend route — but it archives
// (isArchived: true), it never removes the row. See
// ArchiveTemplateButton for how the UI words this.
export function archiveTemplate(templateId: number) {
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}`, {
    method: 'DELETE',
  })
}

// No body — the source is the :id in the URL, and the new copy's owner
// is always whoever is logged in (the backend reads that from the
// session, never from anything the client sends).
export function duplicateTemplate(templateId: number) {
  return apiRequest<ProgramTemplateDetail>(
    `/programs/${templateId}/duplicate`,
    { method: 'POST' },
  )
}

// Reorders the exercises of ONE workout. `order` is the full, reordered
// list of that workout's rows' own ids (template_exercises.id, NOT
// exerciseId) — the backend checks it is exactly that workout's rows,
// reordered. Exercises of other workouts keep their positions: each
// workout's list is ordered on its own.
//
// The workout is always named, even in a one-workout template where the
// backend would default to it: the request says what it means.
export function reorderTemplateExercises(
  templateId: number,
  workoutId: number,
  order: number[],
) {
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}/exercises`, {
    method: 'PATCH',
    body: { workoutId, order },
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
//
// Every field also accepts null, which means "clear this value." Three
// different states, three different meanings:
//   - key absent   → don't touch this field
//   - key: null    → clear it (stored as SQL NULL)
//   - key: value   → set it
// undefined can NOT stand in for "clear": JSON has no undefined, so
// JSON.stringify drops the key entirely and it arrives as "absent" —
// which is exactly the bug this null support fixed (clearing sets/reps/
// duration/weight used to send an empty {} body and change nothing).
// weight and weightUnit are cleared together, as a pair — the backend
// rejects clearing only one of them (see hasStartedWeight).
export interface UpdateTemplateExercisePayload {
  sets?: number | null
  reps?: number | null
  durationInSeconds?: number | null
  weight?: number | null
  weightUnit?: 'kg' | 'lbs' | null
  notes?: string | null
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

// Same "fetch the current template, then append" shape as
// assignExerciseToProgram — sortOrder is still a required field the
// backend doesn't compute for you. This is the richer sibling of that
// function: it carries the full prescription (sets/reps/duration/
// weight/unit) the New Program Exercise screen collects, and the workout
// the exercise goes to.
//
// `workoutId` null = no workout named (a one-workout template's add card):
// the key is left out of the body, and the backend uses the first workout.
// Either way the position is the end of the workout it goes to.
//
// Why fetch the template here rather than use what the page has: the page
// may have been open a while (or reached by a bookmark); the freshest list
// gives the right "end of the workout".
export async function addTemplateExercise(
  templateId: number,
  exerciseId: number,
  values: AddTemplateExerciseFormValues,
  workoutId: number | null = null,
) {
  const template = await fetchProgram(templateId)
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}/exercises`, {
    method: 'POST',
    body: {
      exerciseId,
      // undefined (not null) when no workout is named: JSON.stringify drops
      // the key, so the body says nothing about workouts at all.
      workoutId: workoutId ?? undefined,
      sets: values.sets,
      reps: values.reps,
      durationInSeconds: values.durationInSeconds,
      weight: values.weight,
      weightUnit: values.weightUnit,
      sortOrder: nextExercisePosition(
        template.exercises,
        workoutId ?? firstWorkoutId(template),
      ),
    },
  })
}

// --- WORKOUTS (step 3a-w) ---------------------------------------------------
//
// Every one of these answers with the FULL template (workouts + exercises),
// like every other template write: the caller writes it straight into the
// template's cache entry.

// A new, unnamed workout after the last one (the backend picks its
// position). An empty body, not `{ name: null }`: the name is optional, and
// the practitioner names the workout afterwards, on its header.
export function addTemplateWorkout(templateId: number) {
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}/workouts`, {
    method: 'POST',
    body: {},
  })
}

// `name` null clears it ("B" instead of "B · Strength"). The key is required
// by the backend: a rename that sends no name is a mistake, not "no change".
export function renameTemplateWorkout(
  templateId: number,
  workoutId: number,
  name: string | null,
) {
  return apiRequest<ProgramTemplateDetail>(
    `/programs/${templateId}/workouts/${workoutId}`,
    { method: 'PATCH', body: { name } },
  )
}

// The complete new order of the template's workouts — the first becomes A.
export function reorderTemplateWorkouts(templateId: number, order: number[]) {
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}/workouts`, {
    method: 'PATCH',
    body: { order },
  })
}

// Only an empty workout, never the last (the backend answers 409 otherwise,
// with a message saying why).
export function removeTemplateWorkout(templateId: number, workoutId: number) {
  return apiRequest<ProgramTemplateDetail>(
    `/programs/${templateId}/workouts/${workoutId}`,
    { method: 'DELETE' },
  )
}

// MOVE an exercise to another workout: the same row, with a new workoutId.
// No position is sent, so the backend puts it at the END of that workout.
export function moveTemplateExercise(
  templateId: number,
  templateExerciseId: number,
  workoutId: number,
) {
  return apiRequest<ProgramTemplateDetail>(
    `/programs/${templateId}/exercises/${templateExerciseId}`,
    { method: 'PATCH', body: { workoutId } },
  )
}

// COPY (roadmap Phase 6.5): one exercise or several — the menu's "Copy to"
// and the workout's "Copy exercises" dialog — into a workout of this
// template, or a NEW one, in ONE request. The backend copies the rows
// (library exercise + prescription), appends them after the target's last
// exercise, and answers with the whole template. (Until then a copy was the
// ordinary add route, with a position computed here from the screen.)
export function copyTemplateExercises(
  templateId: number,
  exerciseIds: number[],
  target: CopyTarget,
) {
  return apiRequest<ProgramTemplateDetail>(`/programs/${templateId}/exercises/copy`, {
    method: 'POST',
    body: copyRequestBody(exerciseIds, target),
  })
}