import { apiRequest } from '@/api/client'
import type { Session, SessionExerciseChanges, StartSessionInput } from './types'

// The session routes (backend src/sessions/, Phase 4 step 1). Every write
// answers the WHOLE session, checklist included — so the screen writes the
// answer into the cache instead of asking again.

// One session — its own top-level key, like a program's. Not under the
// program's key: a session is read by its id alone (the session page's
// address has no program id), and invalidating a program after a schedule
// change has no reason to throw away an open session's checklist.
export function sessionQueryKey(id: number) {
  return ['sessions', id] as const
}

// GET /sessions/:id — the session with its checklist. The patient, their
// care team and admins may read it; anyone else gets a 404 (row security
// hides it), never a 403 that would confirm it exists.
export function fetchSession(id: number) {
  return apiRequest<Session>(`/sessions/${id}`)
}

// POST /sessions — start: the session is created OPEN (`in_progress`, its
// start the database's moment), with its checklist copied from the
// program. 201 with the session.
export function startSession(input: StartSessionInput) {
  return apiRequest<Session>('/sessions', { method: 'POST', body: input })
}
// PATCH /sessions/:id/exercises/:rowId — a tick, a rating, a note; only
// while the session is open (else 409 "This session is finished…"). Answers
// the whole session, like every session write. Audited by the backend, one
// entry per real change (SESSION_EXERCISE_UPDATED).
export function updateSessionExercise(
  sessionId: number,
  rowId: number,
  changes: SessionExerciseChanges,
) {
  return apiRequest<Session>(`/sessions/${sessionId}/exercises/${rowId}`, {
    method: 'PATCH',
    body: changes,
  })
}