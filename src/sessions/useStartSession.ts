import { startSession } from './api'
import type { Session } from './types'
import { useSessionWrite } from './useSessionWrite'

// Start a session (pass (a)). What a session write refreshes is said once,
// in useSessionWrite (since pass (c)): the answer cached, the program's
// summaries stale, then `onStarted` — the page navigates.
export function useStartSession(onStarted: (session: Session) => void) {
  return useSessionWrite(startSession, onStarted)
}