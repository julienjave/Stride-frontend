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

import type {
  AttendanceAlert,
  CareTeamJoinAlert,
  ComplaintReviewAlert,
  LegalDisclosureAlert,
  PatientMergeAlert,
  SessionAlert,
  StaffSession,
} from './types'
import { session } from '@/sessions/testData'

// Shared fixtures for the To-do's tests (2026-10-19). Dates in 2031, far
// from today, so no test depends on when it runs.

export const PAT_ALERT = { id: 6, firstName: 'Pat', lastName: 'Lee', avatarUrl: null }
export const JO_ALERT = { id: 7, firstName: 'Jo', lastName: 'Novak', avatarUrl: null }

export function attendanceAlert(fields: Partial<AttendanceAlert> = {}): AttendanceAlert {
  return {
    kind: 'attendance',
    patient: JO_ALERT,
    program: { id: 20, title: 'Lower Back — Jo' },
    missedInARow: { days: 0, weeks: 2, since: '2031-05-26' },
    inactive: null,
    ...fields,
  }
}

export function sessionAlert(
  fields: Partial<Omit<SessionAlert, 'session'>> & { session?: Partial<SessionAlert['session']> } = {},
): SessionAlert {
  const { session: sessionFields, ...rest } = fields
  return {
    kind: 'session',
    patient: PAT_ALERT,
    program: { id: 12, title: 'Knee Rehab — Pat' },
    reasons: ['pain_high', 'pain_rise'],
    hardExercises: [],
    ...rest,
    session: {
      id: 31,
      localDate: '2031-06-10',
      status: 'completed',
      endReason: null,
      painBefore: 3,
      painAfter: 7,
      ...sessionFields,
    },
  }
}

// Session 31 as the care team reads it: finished on 10 June, nobody's
// review yet.
export function staffSession(fields: Partial<StaffSession> = {}): StaffSession {
  return {
    ...session({
      localDate: '2031-06-10',
      status: 'completed',
      completedAt: '2031-06-10T17:00:00.000Z',
      painBefore: 3,
      painAfter: 7,
      mobilityAfter: 4,
    }),
    reviews: [],
    ...fields,
  }
}
// Sam Lee joined Pat's care team by themselves on 10 June 2031, at noon UTC —
// the same calendar day in Paris and Montreal, where the tests run.
export function joinAlert(
  fields: Partial<Omit<CareTeamJoinAlert, 'link'>> & { link?: Partial<CareTeamJoinAlert['link']> } = {},
): CareTeamJoinAlert {
  const { link, ...rest } = fields
  return {
    kind: 'care_team_join',
    patient: PAT_ALERT,
    ...rest,
    link: {
      id: 41,
      practitioner: { id: 4, firstName: 'Sam', lastName: 'Lee' },
      addedBy: null,
      startedAt: '2031-06-10T12:00:00.000Z',
      endsAt: null,
      ...link,
    },
  }
}

// Avery Admin opened a complaint review of Pat's record on 10 June 2031 at noon
// UTC, for the 7 days (until 17 June) — same calendar days in Paris and
// Montreal.
export function complaintReviewAlert(
  fields: Partial<Omit<ComplaintReviewAlert, 'review'>> & {
    review?: Partial<ComplaintReviewAlert['review']>
  } = {},
): ComplaintReviewAlert {
  const { review, ...rest } = fields
  return {
    kind: 'complaint_review',
    patient: PAT_ALERT,
    ...rest,
    review: {
      id: 12,
      openedBy: { id: 1, firstName: 'Avery', lastName: 'Admin' },
      openedAt: '2031-06-10T12:00:00.000Z',
      expiresAt: '2031-06-17T12:00:00.000Z',
      endedAt: null,
      ...review,
    },
  }
}
// Avery Admin disclosed Pat's record to Det. Jane Roe of the Montreal Police
// on 10 June 2031 at noon UTC, no hold — the same calendar day in Paris and
// Montreal.
export function legalDisclosureAlert(
  fields: Partial<Omit<LegalDisclosureAlert, 'disclosure'>> & {
    disclosure?: Partial<LegalDisclosureAlert['disclosure']>
  } = {},
): LegalDisclosureAlert {
  const { disclosure, ...rest } = fields
  return {
    kind: 'legal_disclosure',
    patient: PAT_ALERT,
    ...rest,
    disclosure: {
      id: 21,
      madeBy: { id: 1, firstName: 'Avery', lastName: 'Admin' },
      madeAt: '2031-06-10T12:00:00.000Z',
      recipientName: 'Det. Jane Roe',
      recipientOrganisation: 'Montreal Police',
      withheldUntil: null,
      ...disclosure,
    },
  }
}

// Avery Admin merged a second account of Pat into Pat's on 10 June 2031 at
// noon UTC.
export function patientMergeAlert(
  fields: Partial<Omit<PatientMergeAlert, 'merge'>> & {
    merge?: Partial<PatientMergeAlert['merge']>
  } = {},
): PatientMergeAlert {
  const { merge, ...rest } = fields
  return {
    kind: 'patient_merge',
    patient: PAT_ALERT,
    ...rest,
    merge: {
      id: 31,
      mergedBy: { id: 1, firstName: 'Avery', lastName: 'Admin' },
      mergedAt: '2031-06-10T12:00:00.000Z',
      ...merge,
    },
  }
}
