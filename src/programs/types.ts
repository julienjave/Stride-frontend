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

export interface TemplateExercise {
  id: number
  templateId: number
  exerciseId: number
  sets: number | null
  reps: number | null
  durationInSeconds: number | null
  sortOrder: number
  notes: string | null
}

// The shape GET /programs/:id returns — ProgramsService.findOne spreads
// the template row plus its ordered exercises array (see that method's
// own `{ ...template, exercises: exerciseRows }` return).
export interface ProgramTemplateDetail extends ProgramTemplate {
  exercises: TemplateExercise[]
}