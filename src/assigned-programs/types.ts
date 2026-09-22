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

export interface AssignedProgramExercise {
  id: number
  assignedProgramId: number
  exerciseId: number
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