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
  // Set when the exercise was REMOVED from the program after sessions used
  // it (backend step 3b-0): kept for those sessions' records, out of the
  // program. null for every exercise still in it. `retiredBy` = who removed
  // it (a user id).
  retiredAt: string | null
  retiredBy: number | null
}

// GET /assigned-programs/:id, and the answer to every write on a program.
// `exercises` is ONE flat list, workout by workout (A's in order, then
// B's…), each carrying its workoutId — flat so a screen that doesn't group
// by workout still lists everything in a sensible order. Only the exercises
// IN the program: the removed ones (retired — kept for the sessions that
// used them) come apart, in `retiredExercises`, in the order they were
// removed (step 3b-0), so a screen that doesn't care never sees them.
export interface AssignedProgramDetail extends AssignedProgram {
  workouts: ProgramWorkout[]
  exercises: AssignedProgramExercise[]
  retiredExercises: AssignedProgramExercise[]
}

// GET /assigned-programs/:id/exercises/:rowId/removal (step 3b-1) — what
// removing that exercise WOULD do: deleted (no session used it), or retired
// (kept for the `sessionCount` sessions that did). The same rule the
// removal follows; the removal decides again when it happens.
export interface RemovalPreview {
  outcome: 'deleted' | 'retired'
  sessionCount: number
}

// --- ITS PROGRESS (GET /assigned-programs/:id/summary?today=) -----------------
//
// What the backend's schedule module (summarizeSchedule, decisions §5) says
// about a program: every scheduled day and weekly count, judged. Copied
// from the backend's schedule-summary.ts and checked against live answers
// for the seeded programs (2026-10-12). The screen only DISPLAYS these
// judgements — it never decides itself whether a day was missed: one
// module decides, every screen asks it.

// A scheduled day of a specific-days schedule:
//   done       — a session of that day's workout, on that day;
//   made_up    — done later, on an unscheduled day before the next scheduled one;
//   done_early — done AHEAD, on a free day before it in the same week;
//   swapped    — exchanged with another scheduled day of the same week (each
//                did the other's workout);
//   missed   — not done, and its make-up window has closed;
//   due      — not done yet, and still possible (today, or a window still open);
//   upcoming — in the future.
export type DayState =
  | 'done'
  | 'made_up'
  | 'done_early'
  | 'swapped'
  | 'missed'
  | 'due'
  | 'upcoming'

export interface ScheduledDay {
  date: string
  // The workout the day expects (one of the program's workout ids).
  workoutId: number
  state: DayState
  sessionId: number | null
  // The session that made it up and the day it was done (state made_up).
  madeUpBy: { sessionId: number; date: string } | null
  // The session done ahead of time and its (free) day (state done_early).
  doneEarlyBy: { sessionId: number; date: string } | null
  // The session done on the OTHER scheduled day of the swap, and that day
  // (state swapped).
  swappedBy: { sessionId: number; date: string } | null
}

export type WeekState = 'met' | 'missed' | 'in_progress' | 'upcoming'

// A stretch of a program week under an "N times a week" version — the whole
// week, or the part of it left by an end date, a schedule change or a pause
// (its target is then scaled to its length).
export interface CountedWeek {
  // 1 = the week starting on the program's start date.
  programWeek: number
  start: string
  end: string
  timesPerWeek: number
  target: number
  // The rotation positions this stretch needs, in order, and the session
  // that did each (null = not yet).
  workouts: { workoutId: number; sessionId: number | null }[]
  done: number
  state: WeekState
  sessionIds: number[]
}

// Why a completed session didn't count for anything — see the backend's
// ExtraReason for each rule. The screen words each one (extraReasonText).
export type ExtraReason =
  | 'same_day'
  | 'outside_program'
  | 'no_missed_day'
  | 'beyond_target'
  | 'wrong_workout'
  | 'repeated_workout'
  | 'paused'
  | 'swap_not_counted'
  | 'already_done'

export interface ExtraSession {
  sessionId: number
  date: string
  reason: ExtraReason
}

export interface ScheduleSummary {
  // The days covered: the start date to the end date — or, open-ended, to
  // the end of the current program week.
  firstDay: string
  lastDay: string
  today: string
  totals: {
    // null for an open-ended program: it has no total (a count, no bar).
    expected: number | null
    done: number
    madeUp: number
    doneEarly: number
    swapped: number
    missed: number
    extra: number
  }
  days: ScheduledDay[]
  weeks: CountedWeek[]
  extraSessions: ExtraSession[]
  // `to` null = nothing ends the pause.
  pauses: { from: string; to: string | null }[]
  // What to do next: a specific day's workout (forDay; a make-up names the
  // MISSED day), or the next workout a week still needs (programWeek).
  // null when nothing is left, or while paused.
  nextWorkout: { workoutId: number; forDay: string | null; programWeek: number | null } | null
}

// --- CREATING ONE (POST /assigned-programs) -----------------------------------

// The FIRST schedule version, which applies from the start date. Days and
// rotation name workouts by POSITION in the template (0 = A): the
// program's own workouts — and their ids — are created by this same request.
export type NewProgramSchedule =
  | { type: 'weekdays'; days: { weekday: number; workoutIndex: number }[] }
  // rotation omitted = every workout in order (the backend's default).
  | { type: 'times_per_week'; timesPerWeek: number; rotation?: number[] }

// The body the assign form sends: exactly ONE source — a template, or a
// closed program to continue ("Assign again", 3a-2; its workouts and
// tailored exercises are copied). (The backend also accepts an inline
// `exercises` list, which no screen uses.) A union, so a body naming both
// sources — or neither — can't even be written.
export type CreateAssignedProgramInput = (
  | { basedOnTemplateId: number; basedOnProgramId?: never }
  | { basedOnProgramId: number; basedOnTemplateId?: never }
) & {
  patientId: number
  title: string
  startDate: string
  // Omitted = open-ended. (Not null: the create DTO's @IsOptional accepts
  // both, but "absent" says it best.)
  endDate?: string
  schedule: NewProgramSchedule
}

// --- CHANGING ITS SCHEDULE (POST /assigned-programs/:id/schedules) ------------

// A later schedule version: "from effectiveFrom on, the schedule is …". The
// program exists, so workouts are named by the PROGRAM's own ids (not
// positions, as when assigning). A version starting on that day or later
// is REPLACED (the backend's rule — decisions §5, point 5). A union again:
// each kind carries only its own fields, as the backend requires (it
// refuses another kind's fields with a 400).
export type ScheduleVersionInput = { effectiveFrom: string } & (
  | { type: 'weekdays'; days: { weekday: number; workoutId: number }[] }
  // rotation omitted = every workout in order (the backend's default).
  | { type: 'times_per_week'; timesPerWeek: number; rotation?: number[] }
  // Nothing is due from that day until a later version resumes it.
  | { type: 'paused' }
)

// --- CLOSING IT (POST …/cancel, …/complete; GET …/closing) --------------------

// What cancelling or completing does (or WOULD do — the preview). Archived =
// cancelled before any session: deleted, so no end date.
export interface ClosingPlan {
  outcome: 'archived' | 'cancelled' | 'completed'
  endDate: string | null
}

// GET /assigned-programs/:id/closing?today= — both answers at once, decided
// by the backend's own rule (planClosing), from facts the page can't see
// (unfinished sessions; a session completed today).
export interface ClosingPreview {
  cancel: ClosingPlan
  complete: ClosingPlan
}

// The answer of POST …/cancel and …/complete: the program as it now is —
// null when archived (it's gone).
export interface CloseResult {
  outcome: ClosingPlan['outcome']
  program: AssignedProgramDetail | null
}

// PATCH /assigned-programs/:id — the fields the program page changes. A
// PATCH changes only what it sends: an absent key keeps the stored value.
//   - title: never blank (the backend refuses it — 400);
//   - startDate: only while the program hasn't started (the backend moves
//     the schedule with it);
//   - endDate: `null` = no end date any more (open-ended) — a real value,
//     unlike an absent key, which is why the type says `| null` here and
//     nowhere else (title, startDate and allowSwaps can't be null: 400);
//   - allowSwaps: "Let the patient rearrange the week".
export interface UpdateAssignedProgramInput {
  title?: string
  startDate?: string
  endDate?: string | null
  allowSwaps?: boolean
}