import { apiRequest } from '@/api/client'
import { assignedProgramQueryKey } from '@/assigned-programs/api'
import type { Session } from '@/sessions/types'

// One session as the program's LIST gives it (GET
// /assigned-programs/:id/sessions): the session row without its checklist —
// the backend leaves `exercises` out of a list read often (Phase 4 step 1b).
// `Omit` keeps every other field of `Session` in step with it: a field added
// to the session type reaches this one too.
export type ProgramSession = Omit<Session, 'exercises'>

// A program's sessions — the progress charts' data (2026-10-18). UNDER the
// program's own key, like the summary (assigned-programs/api.ts): closing
// the program invalidates ['assigned-programs', id], a prefix match, which
// refreshes this too — closing closes its open session — and a session
// write marks this stale with one more prefix (useSessionWrite).
export function programSessionsQueryKey(programId: number) {
  return [...assignedProgramQueryKey(programId), 'sessions'] as const
}

// Every session of the program, newest first (the backend's order), with no
// `from` / `to`: the charts can show the whole program, and their
// "last 12 weeks" is a view of the same answer — switching costs no
// request. A program a year long at three sessions a week is ~160 short
// rows: one request is fine. Same access as the program: the patient, the
// care team, an admin (anyone else: 404).
export function fetchProgramSessions(programId: number) {
  return apiRequest<ProgramSession[]>(`/assigned-programs/${programId}/sessions`)
}