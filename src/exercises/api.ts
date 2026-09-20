import { apiRequest } from '@/api/client'
import type { ExerciseDetail, ExercisesPage } from './types'
import type { CreateExerciseFormValues } from './schemas'

// --- QUERY KEYS --------------------------------------------------------

export interface FetchExercisesParams {
  page?: number
  search?: string
  mine?: boolean
}

// 'exercises-list' as its own top-level key, distinct from
// exerciseQueryKey(id) below — the same reasoning
// clinicsListQueryKey/usersListQueryKey already established: invalidating
// every cached LIST variant after a create/update needs a prefix match
// that must NOT also sweep up individual detail-view cache entries
// sharing the same top-level key.
//
// Every parameter that affects the RESULT is part of the key — page,
// search, and mine all change what comes back, so all three have to be
// in here. Without this, switching "own only" on and off would just
// read whichever mode was cached first.
export function exercisesListQueryKey(params: FetchExercisesParams) {
  return [
    'exercises-list',
    params.page ?? 1,
    params.search ?? '',
    params.mine ?? false,
  ] as const
}

// A distinct top-level key ('exercise', not 'exercises-list') — see
// exercisesListQueryKey's own comment for why this separation matters:
// invalidating the list after a mutation must never accidentally also
// invalidate (or collide with) one specific exercise's own cached detail.
export function exerciseQueryKey(id: number) {
  return ['exercise', id] as const
}

// --- QUERIES -----------------------------------------------------------

export function fetchExercises(params: FetchExercisesParams = {}) {
  // URLSearchParams over manual string concatenation — this is the
  // first query with more than one optional parameter in this codebase
  // (fetchClinics' includeInactive is the only precedent, and that's a
  // single ternary). URLSearchParams handles encoding correctly (a
  // search term with a space or an ampersand in it, say) and scales
  // cleanly as more params potentially get added later, where manual
  // string-building would only get more error-prone with each one.
  const query = new URLSearchParams()
  if (params.page && params.page !== 1) {
    query.set('page', String(params.page))
  }
  if (params.search) {
    query.set('search', params.search)
  }
  if (params.mine) {
    query.set('mine', 'true')
  }

  const queryString = query.toString()
  return apiRequest<ExercisesPage>(
    `/exercises${queryString ? `?${queryString}` : ''}`,
  )
}

export function fetchExercise(id: number) {
  return apiRequest<ExerciseDetail>(`/exercises/${id}`)
}

// --- MUTATIONS -----------------------------------------------------------

export function createExercise(values: CreateExerciseFormValues) {
  // Flattens the { value: string }[] shape useFieldArray requires (see
  // schemas.ts's own comment) back down to the plain string[] the
  // backend's CreateExerciseDto actually expects — the backend has no
  // concept of React Hook Form's row-identity requirement, so this
  // conversion has to happen somewhere, and api.ts (the boundary between
  // form state and the wire format) is the same place createClinic
  // already does its own values -> payload shaping.
  return apiRequest<ExerciseDetail>('/exercises', {
    method: 'POST',
    body: {
      name: values.name,
      primaryMuscles: values.primaryMuscles.map((item) => item.value),
      secondaryMuscles: values.secondaryMuscles.map((item) => item.value),
      equipment: values.equipment.map((item) => item.value),
      instructions: values.instructions.map((item) => item.value),
    },
  })
}

// Up to 5 files per call, matching the backend's own FilesInterceptor
// limit exactly (see exercises.controller.ts) — enforced client-side
// too (see ExercisePhotosPage) so a rejection shows up immediately as a
// clear message, rather than as a generic 400 only after a real request
// round-trip.
export function uploadExerciseImages(id: number, files: File[]) {
  const formData = new FormData()
  // The backend's FilesInterceptor("files", ...) expects the form field
  // itself to be named "files", repeated once per file — not one field
  // holding an array.
  for (const file of files) {
    formData.append('files', file)
  }
  return apiRequest<ExerciseDetail>(`/exercises/${id}/images`, {
    method: 'POST',
    body: formData,
  })
}

// order is the full, reordered list of every existing image's objectKey
// — the backend validates this is an exact permutation of the current
// gallery (same keys, just reordered), not a partial or padded list.
export function reorderExerciseImages(id: number, order: string[]) {
  return apiRequest<ExerciseDetail>(`/exercises/${id}/images`, {
    method: 'PATCH',
    body: { order },
  })
}

export function removeExerciseImage(id: number, objectKey: string) {
  return apiRequest<ExerciseDetail>(`/exercises/${id}/images`, {
    method: 'DELETE',
    body: { objectKey },
  })
}