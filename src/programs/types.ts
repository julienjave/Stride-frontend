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

// One of a template's workouts (backend step 2b-i): a template has one or
// more, A, B… by `sortOrder` — the letter is derived from that order
// (workoutLabel), never stored. `name` is optional (null = no name). A
// template written before workouts existed has exactly one, unnamed.
export interface TemplateWorkout {
  id: number
  templateId: number
  name: string | null
  sortOrder: number
}

export interface TemplateExercise {
  id: number
  templateId: number
  // The workout it belongs to (one of the template's `workouts`). Its
  // sortOrder below is the position WITHIN that workout.
  workoutId: number
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

// The shape GET /programs/:id returns: the template row, its workouts in
// order, and ONE flat exercise list, workout by workout (A's exercises in
// order, then B's…), each with its workoutId.
export interface ProgramTemplateDetail extends ProgramTemplate {
  workouts: TemplateWorkout[]
  exercises: TemplateExercise[]
}