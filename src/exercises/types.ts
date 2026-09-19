// Hand-written, not generated — same gap CurrentUser (auth/types.ts) and
// RegisterClinicResult already work around: GET /exercises has no
// @ApiResponse decorator backend-side, so openapi-typescript generates
// its 200 response as content?: never, an unusable empty type. This
// models what the endpoint actually returns instead.

export interface ExerciseAuthor {
  firstName: string
  lastName: string
}

// Mirrors the exercises table (see backend's exercises.schema.ts) plus
// the `author` field ExercisesService.findAll attaches via a separate
// batched lookup — author is null both for exercises with no creator
// (the shared api-sourced library) and, defensively, for any custom
// exercise whose creator's account no longer exists (createdBy is
// ON DELETE SET NULL on the backend).
export interface Exercise {
  id: number
  externalId: string | null
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  instructions: string[]
  mediaUrls: string[]
  source: 'api' | 'custom'
  createdBy: number | null
  isArchived: boolean
  author: ExerciseAuthor | null
}

export interface ExercisesPage {
  data: Exercise[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}