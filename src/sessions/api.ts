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

import { apiRequest } from '@/api/client'
import type {
  CompleteSessionInput,
  Session,
  SessionExerciseChanges,
  SkipSessionInput,
  StartSessionInput,
  StopSessionInput,
} from './types'

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
// The three endings (pass (c)). Each answers the session as it now is.
// POST /sessions/:id/complete — only on the session's own day (409 "…stop it
// instead" otherwise); final.
export function completeSession(sessionId: number, input: CompleteSessionInput) {
  return apiRequest<Session>(`/sessions/${sessionId}/complete`, { method: 'POST', body: input })
}

// POST /sessions/:id/stop — any open session, any day; it becomes
// `incomplete` with the patient's reason; final.
export function stopSession(sessionId: number, input: StopSessionInput) {
  return apiRequest<Session>(`/sessions/${sessionId}/stop`, { method: 'POST', body: input })
}

// POST /sessions/skip — a NEW row, `skipped`, no checklist (201).
export function skipSession(input: SkipSessionInput) {
  return apiRequest<Session>('/sessions/skip', { method: 'POST', body: input })
}