import type { SessionEndReason } from '@/assigned-programs/types'
import type { WeightUnit } from '@/common/weight'

// A session as the backend answers it (GET /sessions/:id and every session
// write — Phase 4 step 1). The four statuses and their life
// (backend src/sessions/session-rules.ts):
//
//     start ──► in_progress ──► completed     (Finish)
//                    └────────► incomplete    (Stop — or closed by the app)
//     skip ───────────────────► skipped
//
// Only `in_progress` changes; the three others are final.
export type SessionStatus = 'in_progress' | 'completed' | 'incomplete' | 'skipped'

// One row of a session's checklist. The first group is a COPY of what the
// program prescribed when the session started (steps 3b-0 and D-2): a later
// change to the program never rewrites what THIS session was told. The
// second group is what the patient did.
export interface SessionExercise {
  id: number
  sessionId: number
  // Which program exercise this row copied — how the screen finds the
  // exercise's photos, which live in the library and come with the program
  // (decisions §5, "Exercise photos on a program"), not with the session.
  assignedProgramExerciseId: number
  name: string
  sets: number | null
  reps: number | null
  durationInSeconds: number | null
  weight: number | null
  weightUnit: WeightUnit | null
  notes: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  equipment: string[]
  instructions: string[]
  completed: boolean
  durationActualInSeconds: number | null
  difficultyRating: number | null
  sortOrder: number
  feedback: string | null
}

export interface Session {
  id: number
  assignedProgramId: number
  workoutId: number
  patientId: number
  // The patient's own calendar day the session belongs to (decisions §5,
  // point 4) — the day it STARTED.
  localDate: string
  countsFor: string | null
  status: SessionStatus
  // Moments, written by the database (ISO timestamps).
  startedAt: string | null
  completedAt: string | null
  endedAt: string | null
  endReason: SessionEndReason | null
  endNote: string | null
  // The check-in and check-out (decisions §6): 0–10, all optional.
  painBefore: number | null
  painAfter: number | null
  mobilityAfter: number | null
  totalDurationInSeconds: number | null
  sessionFeedback: string | null
  // In display order (the program's order within the workout).
  exercises: SessionExercise[]
}

// POST /sessions — what starting sends. `workoutId` is always sent by this
// app (the start page knows which workout today asks for — a catch-up is
// the MISSED day's workout, which the backend can't guess); `painBefore`
// only when the patient answered. `countsFor` is never sent: a catch-up is
// a make-up the backend infers (decided 2026-10-15), and swaps / late
// make-ups are other features.
export interface StartSessionInput {
  assignedProgramId: number
  localDate: string
  workoutId: number
  painBefore?: number
}