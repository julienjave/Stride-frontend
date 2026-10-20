import type { SessionStatus, Session } from '@/sessions/types'
import type { SessionEndReason } from '@/assigned-programs/types'

// The practitioner's "For review" list (decided 2026-10-19, decisions §3): what
// GET /alerts answers. Written by hand from the backend's types
// (src/alerts/alerts.service.ts) — two shapes told apart by `kind`, a
// "discriminated union": after `if (alert.kind === 'session')`, TypeScript
// knows `alert.session` exists, so a screen can't read a field the other
// kind doesn't have.

// Who the alert is about — enough for the row, nothing more.
export interface AlertPatient {
  id: number
  firstName: string
  lastName: string
  avatarUrl: string | null
}

export interface AlertProgram {
  id: number
  title: string
}

// The latest run of misses: scheduled days and / or program weeks, from
// its first missed day.
export interface MissedRun {
  days: number
  weeks: number
  since: string
}

export interface Inactivity {
  // Program days without a session, paused days not counted.
  days: number
  // null when there was none since the program started.
  lastSessionDate: string | null
}

// "This program's patient has stopped coming" — gone by itself once the
// patient acts. At least one of the two facts is set.
export interface AttendanceAlert {
  kind: 'attendance'
  patient: AlertPatient
  program: AlertProgram
  missedInARow: MissedRun | null
  inactive: Inactivity | null
}

export type SessionAlertReason =
  | 'ended_for_pain'
  | 'pain_high'
  | 'pain_rise'
  | 'hard_exercise'
  | 'patient_note'

// "This session needs a look" — until I mark it reviewed, or it is more
// than 14 days old. Never the patient's words: the session page has them.
export interface SessionAlert {
  kind: 'session'
  patient: AlertPatient
  program: AlertProgram
  session: {
    id: number
    localDate: string
    status: Exclude<SessionStatus, 'in_progress'>
    endReason: SessionEndReason | null
    painBefore: number | null
    painAfter: number | null
  }
  reasons: SessionAlertReason[]
  hardExercises: { name: string; rating: number }[]
}

export type Alert = AttendanceAlert | SessionAlert

// One review of a session: who on the care team looked at it, and when.
export interface SessionReview {
  practitioner: { id: number; firstName: string; lastName: string }
  reviewedAt: string
}

// GET /sessions/:id as the care team reads it: the session plus its
// reviews (the patient's answer has no `reviews` key — a separate type, so
// patient screens can't read it by mistake).
export type StaffSession = Session & { reviews: SessionReview[] }

// What reviewing a program's attendance alert answers: the review that now
// covers it — the facts it saw (first day of each, or null) and when.
export interface ProgramAlertReview {
  missedSince: string | null
  inactiveSince: string | null
  reviewedAt: string
}