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
  sortOrder: number
  notes: string | null
}

export interface AssignedProgramDetail extends AssignedProgram {
  exercises: AssignedProgramExercise[]
}