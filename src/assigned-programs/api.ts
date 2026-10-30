import { apiRequest } from '@/api/client'
import { copyRequestBody, type CopyTarget } from '@/workouts/copyExercises'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'
import type { ExerciseDescriptionChanges } from '@/exercises/descriptionRules'
import type { AddTemplateExerciseFormValues } from '@/programs/schemas'
import type {
  AssignedProgramDetail,
  AssignedProgramListItem,
  ClosingPreview,
  CloseResult,
  CreateAssignedProgramInput,
  RemovalPreview,
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
//
// `through` (the patient home, which reads two weeks ahead) is part of the
// key when given: it changes how far the answer reaches. Still under the
// same 'summary' prefix, so every invalidation of a program's summary
// reaches it too.
export function assignedProgramSummaryQueryKey(id: number, today: string, through?: string) {
  const key = [...assignedProgramQueryKey(id), 'summary', today] as const
  return through === undefined ? key : ([...key, through] as const)
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
//
// `through` (optional): cover at least up to that day — an open-ended
// program's summary otherwise stops at the end of the current program week.
export function fetchAssignedProgramSummary(id: number, today: string, through?: string) {
  const extra = through === undefined ? '' : `&through=${through}`
  return apiRequest<ScheduleSummary>(`/assigned-programs/${id}/summary?today=${today}${extra}`)
}

// The library's "Assign → Assigned Program": ONE request. No position is
// sent: since step 3b-0 the backend puts the exercise after the LAST one of
// the workout (the first workout, as none is named here), working it out
// inside its own transaction. This used to read the program first and send
// `program.exercises.length` — every workout's exercises counted, while
// positions restart at 0 in each workout and removals leave gaps, so on a
// two-workout program the new exercise could land in the middle of A or
// clash with a position already taken. Leaving the position to the side
// that holds the data is also one request instead of two.
export function assignExerciseToAssignedProgram(
  assignedProgramId: number,
  exerciseId: number,
) {
  return apiRequest<AssignedProgramDetail>(
    `/assigned-programs/${assignedProgramId}/exercises`,
    { method: 'POST', body: { exerciseId } },
  )
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
// --- TAILORING: WORKOUTS AND EXERCISES (step 3b-1) ---------------------------
//
// The program twins of the template routes (src/programs/api.ts), under
// /assigned-programs/:id. Every one answers with the FULL program — the
// caller writes it into the program's cache entry — and the backend writes
// ONE audit entry per change (step 3b-0: the convention for every route that
// changes a patient's prescription).

// A new, unnamed workout after the last one; named afterwards on its header.
export function addProgramWorkout(id: number) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}/workouts`, {
    method: 'POST',
    body: {},
  })
}

// `name` null clears it ("B" instead of "B · Strength"); the key is required.
export function renameProgramWorkout(id: number, workoutId: number, name: string | null) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}/workouts/${workoutId}`, {
    method: 'PATCH',
    body: { name },
  })
}

// The complete new order of the program's workouts — the first becomes A.
export function reorderProgramWorkouts(id: number, order: number[]) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}/workouts`, {
    method: 'PATCH',
    body: { order },
  })
}

// Only an empty workout, never the last, never one a session did or a
// schedule version names (the backend answers 409 otherwise, saying why).
export function removeProgramWorkout(id: number, workoutId: number) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}/workouts/${workoutId}`, {
    method: 'DELETE',
  })
}

// One workout's ACTIVE exercises in their new order (the rows' own ids).
export function reorderProgramExercises(id: number, workoutId: number, order: number[]) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}/exercises`, {
    method: 'PATCH',
    body: { workoutId, order },
  })
}

// MOVE: the same row, another workout; the backend puts it at the END.
export function moveProgramExercise(id: number, exerciseRowId: number, workoutId: number) {
  return apiRequest<AssignedProgramDetail>(
    `/assigned-programs/${id}/exercises/${exerciseRowId}`,
    { method: 'PATCH', body: { workoutId } },
  )
}

// COPY (roadmap Phase 6.5): one exercise or several into a workout of this
// program, or a NEW one, in ONE request. The backend copies the ROWS — the
// patient's own description, prescription, photo choice and own photos (to
// new files) — not the library's current entry: the old one-exercise copy
// went through the add route and took the library's text.
export function copyProgramExercises(id: number, exerciseIds: number[], target: CopyTarget) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}/exercises/copy`, {
    method: 'POST',
    body: copyRequestBody(exerciseIds, target),
  })
}

// ADD (step 3b-1b): an exercise from the library, with its prescription,
// into one workout — the program's add page (NewAssignedProgramExercisePage).
// No position: the backend appends after the workout's last exercise
// inside its own transaction (3b-0), so nothing has to be read first —
// unlike the template's add, which still computes it (programs/api.ts).
// The backend copies the exercise's description (name, muscles,
// instructions) from the library: the program keeps its own copy.
//
// `workoutId` null = the page's address named no workout (a one-workout
// program): the key is left out (undefined is dropped by JSON) and the
// backend uses the first workout. The form has no notes field (the
// template's form doesn't either); they're added on the exercise's page.
export function addProgramExercise(
  id: number,
  exerciseId: number,
  values: AddTemplateExerciseFormValues,
  workoutId: number | null,
) {
  return apiRequest<AssignedProgramDetail>(`/assigned-programs/${id}/exercises`, {
    method: 'POST',
    body: {
      exerciseId,
      workoutId: workoutId ?? undefined,
      sets: values.sets,
      reps: values.reps,
      durationInSeconds: values.durationInSeconds,
      weight: values.weight,
      weightUnit: values.weightUnit,
    },
  })
}

// What one PATCH of a program's exercise may change: its prescription (step
// 3b-1b — null = cleared) and, since step D-3, the program's own copy of its
// description (never null — "none" is [] for the two optional lists; the
// backend refuses null since D-1).
//
// And which photos the patient sees (program-specific photos, 2026-10-17):
// `useLibraryImages` — true = the library's, false = this exercise's own.
// Never null (the backend refuses it): a choice between two values.
export type ProgramExerciseChanges = PrescriptionChanges &
  ExerciseDescriptionChanges & { useLibraryImages?: boolean }

// EDIT: change one exercise of the program — only the fields given (the
// per-field editors send one field, or the weight's pair). The backend
// records what changed, from → to, in ONE audit entry (3b-0; lists compared
// item by item), and refuses a removed (retired) exercise (409).
export function updateProgramExercise(
  id: number,
  exerciseRowId: number,
  changes: ProgramExerciseChanges,
) {
  return apiRequest<AssignedProgramDetail>(
    `/assigned-programs/${id}/exercises/${exerciseRowId}`,
    { method: 'PATCH', body: changes },
  )
}

// REMOVE: deleted when no session used it, RETIRED otherwise (kept for those
// sessions' records, listed in `retiredExercises`) — the backend decides.
export function removeProgramExercise(id: number, exerciseRowId: number) {
  return apiRequest<AssignedProgramDetail>(
    `/assigned-programs/${id}/exercises/${exerciseRowId}`,
    { method: 'DELETE' },
  )
}

// What removing it WOULD do — for the confirmation dialog. Under the
// program's key, like the summary and the closing preview, so everything
// about one program sits under one prefix.
export function removalPreviewQueryKey(id: number, exerciseRowId: number) {
  return [...assignedProgramQueryKey(id), 'removal', exerciseRowId] as const
}

export function fetchRemovalPreview(id: number, exerciseRowId: number) {
  return apiRequest<RemovalPreview>(
    `/assigned-programs/${id}/exercises/${exerciseRowId}/removal`,
  )
}

// --- An exercise's OWN photos (program-specific photos, 2026-10-17) ---------
//
// Four routes under the program exercise, the same shapes as the library's
// photo routes (src/exercises/api.ts) on purpose — the backend even reuses the
// library's two DTOs. Each answers with the FULL program, which the photo page
// writes into the program's cache entry, like every write on a program.
// Adding photos never switches what the patient sees: that is
// `useLibraryImages`, on updateProgramExercise.

function ownPhotosPath(id: number, exerciseRowId: number) {
  return `/assigned-programs/${id}/exercises/${exerciseRowId}/images`
}

// UPLOAD: up to 5 files a request, 10 own photos in all (the backend says how
// many more fit when there's no room). Multipart: the field "files", once per
// file — the backend's FilesInterceptor('files', …).
export function uploadProgramExerciseImages(id: number, exerciseRowId: number, files: File[]) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  return apiRequest<AssignedProgramDetail>(ownPhotosPath(id, exerciseRowId), {
    method: 'POST',
    body: formData,
  })
}

// COPY the library exercise's current photos into the own ones (after them, in
// the library's order). Copies, not references: a later change in the library
// can't reach them. Asked twice, it copies twice (decided: a duplicate is
// removed like any photo). No body.
export function copyLibraryImagesToProgramExercise(id: number, exerciseRowId: number) {
  return apiRequest<AssignedProgramDetail>(`${ownPhotosPath(id, exerciseRowId)}/from-library`, {
    method: 'POST',
  })
}

// REORDER: the full list of the own photos' keys, in the new order (the first
// is the cover). The backend refuses anything but the same photos.
export function reorderProgramExerciseImages(id: number, exerciseRowId: number, order: string[]) {
  return apiRequest<AssignedProgramDetail>(ownPhotosPath(id, exerciseRowId), {
    method: 'PATCH',
    body: { order },
  })
}

// REMOVE one own photo — its file is deleted for good (decided: a photo of a
// patient's home shouldn't outlive its use). A body on a DELETE, like the
// library's: a key holds slashes.
export function removeProgramExerciseImage(id: number, exerciseRowId: number, objectKey: string) {
  return apiRequest<AssignedProgramDetail>(ownPhotosPath(id, exerciseRowId), {
    method: 'DELETE',
    body: { objectKey },
  })
}