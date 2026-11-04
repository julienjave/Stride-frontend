/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

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

// A colleague joined one of my patients' care teams (decisions §25, the
// post-Phase-6 tidy-up — the backend's CareTeamJoinAlert). `addedBy` is null
// when they joined by themselves; `endsAt` as stored — in the past, they have
// left since; in the future, a planned cover; null, open-ended. Instants (ISO
// strings), not calendar days: a link starts at a moment.
export interface CareTeamJoinAlert {
  kind: 'care_team_join'
  patient: AlertPatient
  link: {
    id: number
    practitioner: PersonName
    addedBy: PersonName | null
    startedAt: string
    endsAt: string | null
  }
}

export interface PersonName {
  id: number
  firstName: string
  lastName: string
}

// An admin opened a complaint review of one of my patients' records (decisions
// §25, pass 2 — the backend's ComplaintReviewAlert): who, when, until, and
// whether it was ended early. NEVER why — the reason stays with the admins,
// down to the database, so this type has no field for it. Instants (ISO).
export interface ComplaintReviewAlert {
  kind: 'complaint_review'
  patient: AlertPatient
  review: {
    id: number
    openedBy: PersonName
    openedAt: string
    expiresAt: string
    // Set when an admin ended it before its 7 days.
    endedAt: string | null
  }
}

// An admin disclosed one of my patients' records outside the clinic because
// the law required it (decisions §25, pass 3 — the backend's
// LegalDisclosureAlert): who made it, when, to whom, and when the patient
// will see it if an agency asked the clinic to hold it back. NEVER the legal
// basis, the parts or the order's reference — the care team can't read them,
// down to the database, so this type has no field for them. Instants (ISO).
export interface LegalDisclosureAlert {
  kind: 'legal_disclosure'
  patient: AlertPatient
  disclosure: {
    id: number
    madeBy: PersonName
    madeAt: string
    recipientName: string
    recipientOrganisation: string | null
    // The moment the patient may see it (null: no hold).
    withheldUntil: string | null
  }
}

// An admin merged a second account of one of my patients into this one
// (decisions §27, pass 4 — the backend's PatientMergeAlert): who merged, and
// when. `patient` is the account the team goes on treating; what moved is in
// the record itself. An instant (ISO).
export interface PatientMergeAlert {
  kind: 'patient_merge'
  patient: AlertPatient
  merge: {
    id: number
    mergedBy: PersonName
    mergedAt: string
  }
}

export type Alert =
  | AttendanceAlert
  | SessionAlert
  | CareTeamJoinAlert
  | ComplaintReviewAlert
  | LegalDisclosureAlert
  | PatientMergeAlert

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