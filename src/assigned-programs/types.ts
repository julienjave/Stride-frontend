// Mirrors assignedPrograms' real DB columns (programs.schema.ts) exactly.
export interface AssignedProgram {
  id: number
  patientId: number
  assignedBy: number
  basedOnTemplateId: number | null
  title: string
  startDate: string
  endDate: string | null
  status: 'active' | 'completed' | 'on_hold' | 'cancelled'
  isArchived: boolean
}

// One row of GET /assigned-programs (every list form, ?patientId= included):
// the program plus WHO assigned it — the name the patient page shows on a
// colleague's program ("by Sam Okafor"). Added by the backend on 2026-10-08,
// looked up for the whole list in one query. Typed `| null` like the
// backend: it can't happen today (assigned_by is NOT NULL, its user can't be
// deleted), but a screen must never crash on a missing name.
export interface AssignedProgramListItem extends AssignedProgram {
  assigner: { id: number; firstName: string; lastName: string } | null
}

export interface AssignedProgramExercise {
  id: number
  assignedProgramId: number
  exerciseId: number
  // Snapshotted from the exercise at add-time, independently editable
  // per patient afterward — NOT a live join, unlike TemplateExercise's
  // equivalent `exercise` sub-object. If the underlying exercise is
  // later edited or archived, this row is completely unaffected: a
  // patient already following this program keeps seeing exactly what
  // was there when it was assigned. See
  // AssignedProgramsService.fetchExerciseSnapshots (backend) for where
  // this gets populated. Deliberately NOT extended to photos yet — see
  // deferred-improvements.md.
  name: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  instructions: string[]
  sets: number | null
  reps: number | null
  durationInSeconds: number | null
  // Same both-or-neither reasoning as TemplateExercise's identical
  // fields — this is genuinely the MORE important of the two tables for
  // weight specifically, since a patient's actual prescribed weight (as
  // opposed to a template's default) is exactly the per-patient value
  // that motivated adding this field at all.
  weight: number | null
  weightUnit: 'kg' | 'lbs' | null
  sortOrder: number
  notes: string | null
}

export interface AssignedProgramDetail extends AssignedProgram {
  exercises: AssignedProgramExercise[]
}