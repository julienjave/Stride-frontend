// Hand-written to match the backend's responses (checked against a live
// GET /assigned-programs and GET /assigned-programs/:id, 2026-10-12).

// `on_hold` is gone (backend step 2b-ii): a pause is now a schedule version
// of type 'paused', with a date it starts from — a status couldn't say
// since when. `cancelled` and `completed` are final (step 2b-iii).
export type ProgramStatus = 'active' | 'completed' | 'cancelled'

// One of a program's workouts (A, B…), copied from the template when it
// was assigned. The letter is derived from the order (workoutLabel), never
// stored; `name` is optional (null = no name).
export interface ProgramWorkout {
  id: number
  assignedProgramId: number
  name: string | null
  sortOrder: number
}

// One version of a program's schedule: "from effectiveFrom on, the
// schedule is …". Versions are added, never edited (decisions §5, point 5);
// the response lists them oldest first, and a day is judged by the latest
// one starting on or before it.
export interface ScheduleVersion {
  id: number
  assignedProgramId: number
  type: 'weekdays' | 'times_per_week' | 'paused'
  // Only for 'times_per_week'; null otherwise.
  timesPerWeek: number | null
  effectiveFrom: string
  createdBy: number
  createdAt: string
  // 'weekdays': one entry per scheduled day, sorted (ISO 1 = Monday).
  // Empty for the other types.
  days: { weekday: number; workoutId: number }[]
  // 'times_per_week': the program's workout ids in rotation order (may
  // repeat). Empty for the other types.
  rotation: number[]
}

// A program as every response carries it (one program, or a list row).
export interface AssignedProgram {
  id: number
  patientId: number
  assignedBy: number
  basedOnTemplateId: number | null
  // "Assign again" (backend step 2b-iii): the closed program this one
  // continues, or null.
  basedOnProgramId: number | null
  title: string
  startDate: string
  // null = open-ended.
  endDate: string | null
  status: ProgramStatus
  isArchived: boolean
  // Whether the patient may do another day's workout in its place (a swap).
  allowSwaps: boolean
  schedules: ScheduleVersion[]
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
  // The workout it belongs to (one of the program's `workouts`).
  workoutId: number
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
  // The position WITHIN its workout (it restarts at 0 in each one).
  sortOrder: number
  notes: string | null
}

// GET /assigned-programs/:id, and the answer to every write on a program.
// `exercises` is ONE flat list, workout by workout (A's in order, then
// B's…), each carrying its workoutId — flat so a screen that doesn't group
// by workout still lists everything in a sensible order.
export interface AssignedProgramDetail extends AssignedProgram {
  workouts: ProgramWorkout[]
  exercises: AssignedProgramExercise[]
}

// --- CREATING ONE (POST /assigned-programs) -----------------------------------

// The FIRST schedule version, which applies from the start date. Days and
// rotation name workouts by POSITION in the template (0 = A): the
// program's own workouts — and their ids — are created by this same request.
export type NewProgramSchedule =
  | { type: 'weekdays'; days: { weekday: number; workoutIndex: number }[] }
  // rotation omitted = every workout in order (the backend's default).
  | { type: 'times_per_week'; timesPerWeek: number; rotation?: number[] }

// The body the assign form sends. The backend also accepts
// `basedOnProgramId` ("Assign again", 3a-2) or an inline `exercises` list
// instead of a template — exactly one source. Only the template form exists
// today.
export interface CreateAssignedProgramInput {
  patientId: number
  basedOnTemplateId: number
  title: string
  startDate: string
  // Omitted = open-ended. (Not null: the create DTO's @IsOptional accepts
  // both, but "absent" says it best.)
  endDate?: string
  schedule: NewProgramSchedule
}