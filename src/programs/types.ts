// Hand-written, matching the same gap CurrentUser/exercises' types
// already work around — mirrors programTemplates' real DB columns
// (programs.schema.ts) exactly, since GET /programs returns the whole
// row with no column selection applied.
export interface ProgramTemplate {
  id: number
  practitionerId: number
  title: string
  description: string | null
  isArchived: boolean
}

// The exercise details attached to a TemplateExercise row — a small
// subset of the full Exercise (just what's needed to render a card),
// matching ExercisesService.withExerciseDetails' own return shape
// exactly. null defensively, mirroring the backend's own defensive
// fallback, for the case a referenced exercise is somehow missing.
export interface TemplateExerciseDetails {
  id: number
  name: string
  primaryMuscles: string[]
}

export interface TemplateExercise {
  id: number
  templateId: number
  exerciseId: number
  sets: number | null
  reps: number | null
  durationInSeconds: number | null
  // A weight with no unit is genuinely ambiguous (50 of what?), so the
  // backend enforces these two as both-or-neither together — see
  // hasStartedWeight (backend/common/validators). Mirrored here as two
  // independently-nullable fields rather than a combined object, since
  // that's exactly what the wire format actually is.
  weight: number | null
  weightUnit: 'kg' | 'lbs' | null
  sortOrder: number
  notes: string | null
  exercise: TemplateExerciseDetails | null
}

// The shape GET /programs/:id returns — ProgramsService.findOne spreads
// the template row plus its ordered exercises array (see that method's
// own `{ ...template, exercises: exerciseRows }` return).
export interface ProgramTemplateDetail extends ProgramTemplate {
  exercises: TemplateExercise[]
}