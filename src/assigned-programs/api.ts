import { apiRequest } from '@/api/client'
import type {
  AssignedProgramDetail,
  AssignedProgramListItem,
  ClosingPreview,
  CloseResult,
  CreateAssignedProgramInput,
  ScheduleSummary,
  ScheduleVersionInput,
  UpdateAssignedProgramInput,
} from './types'

export const assignedProgramsListQueryKey = ['assigned-programs-list'] as const

// One patient's programs (the patient page). It STARTS WITH the list's key
// on purpose: anything that invalidates ['assigned-programs-list'] after
// changing a program (a prefix match) refreshes every patient's list too,
// with no extra line at each call site.
export function patientAssignedProgramsQueryKey(patientId: number) {
  return [...assignedProgramsListQueryKey, 'patient', patientId] as const
}

// One program in full (workouts, exercises, schedules) — the program page's
// entry. Its own top-level key, NOT under the list's: invalidating every
// list after a change must not also throw away the detail just written
// into the cache.
export function assignedProgramQueryKey(id: number) {
  return ['assigned-programs', id] as const
}

// A program's progress, as judged on `today` (the viewer's date). UNDER the
// program's own key on purpose: invalidating ['assigned-programs', id] after
// closing the program is a prefix match, so it refreshes the summary too —
// and after a schedule change, ['assigned-programs', id, 'summary'] alone
// refreshes it for any `today` without refetching the program the change
// already answered with (useAddScheduleVersion). And `today` is part of the
// key: the same program judged on another day is another answer, so a page
// left open past midnight asks again instead of showing yesterday's.
export function assignedProgramSummaryQueryKey(id: number, today: string) {
  return [...assignedProgramQueryKey(id), 'summary', today] as const
}

// No client-side ownership filtering needed here, unlike programs'
// canModifyProgram — AssignedProgramsService.findAllForCurrentUser
// already scopes this server-side per role (a practitioner only ever
// gets back assigned programs belonging to patients they actually
// manage), so every item this returns is already something the
// requesting practitioner can act on.
export function fetchAssignedPrograms() {
  return apiRequest<AssignedProgramListItem[]>('/assigned-programs')
}

// GET /assigned-programs?patientId= — EVERY program of one patient, whoever
// assigned it (the hub only ever shows your own). The backend allows it to
// the patient's care team, the patient and admins; anyone else gets a 403,
// never an empty list.
export function fetchPatientAssignedPrograms(patientId: number) {
  return apiRequest<AssignedProgramListItem[]>(`/assigned-programs?patientId=${patientId}`)
}

export function fetchAssignedProgram(id: number) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}`)
}

// What closing WOULD do today. Under the program's key, like the summary,
// so everything about one program sits under one prefix. Freshness doesn't
// depend on it: the preview is asked again each time the dialog opens
// (staleTime 0, useClosingPreview) — a mutation check confirmed moving the
// key changes nothing visible. `today` is in the key for the same reason
// as the summary's.
export function closingPreviewQueryKey(id: number, today: string) {
  return [...assignedProgramQueryKey(id), 'closing', today] as const
}

export function fetchClosingPreview(id: number, today: string) {
  return apiRequest<ClosingPreview>(`/assigned-programs/${id}/closing?today=${today}`)
}

// POST /assigned-programs/:id/cancel or …/complete, with the practitioner's
// today (the end date depends on it — yesterday, or today if a session was
// completed today). Answers { outcome, program }.
export function closeAssignedProgram(id: number, action: 'cancel' | 'complete', today: string) {
  return apiRequest<CloseResult>(`/assigned-programs/${id}/${action}`, {
    method: 'POST',
    body: { today },
  })
}

// PATCH /assigned-programs/:id — answers with the full program.
export function updateAssignedProgram(id: number, input: UpdateAssignedProgramInput) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}`, {
    method: 'PATCH',
    body: input,
  })
}

// POST /assigned-programs/:id/schedules — a new schedule version (a change,
// a pause or a resume). Answers with the full program, every version
// included.
export function addScheduleVersion(id: number, input: ScheduleVersionInput) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}/schedules`, {
    method: 'POST',
    body: input,
  })
}

// GET /assigned-programs/:id/summary?today= — `today` is required: only the
// viewer's device knows its time zone, so it says which day it is (the
// backend refuses a date that can't be today anywhere). Same access as the
// program itself.
export function fetchAssignedProgramSummary(id: number, today: string) {
  return apiRequest<ScheduleSummary>(`/assigned-programs/${id}/summary?today=${today}`)
}

// Same two-step shape as programs' assignExerciseToProgram — sortOrder
// is a required field the backend doesn't compute for you, so the
// current exercise count has to be read first.
export async function assignExerciseToAssignedProgram(
  assignedProgramId: number,
  exerciseId: number,
) {
  const program = await fetchAssignedProgram(assignedProgramId)
  return apiRequest(`/assigned-programs/${assignedProgramId}/exercises`, {
    method: 'POST',
    body: { exerciseId, sortOrder: program.exercises.length },
  })
}

// POST /assigned-programs — assigns a program to a patient: the backend
// copies the template's workouts and exercises, creates the first schedule
// version, and writes the audit entry, all in one transaction. Answers with
// the full new program (the same shape as GET /assigned-programs/:id).
export function createAssignedProgram(input: CreateAssignedProgramInput) {
  return apiRequest<AssignedProgramDetail>('/assigned-programs', {
    method: 'POST',
    body: input,
  })
}