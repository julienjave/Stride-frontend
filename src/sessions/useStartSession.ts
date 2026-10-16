import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignedProgramQueryKey } from '@/assigned-programs/api'
import { sessionQueryKey, startSession } from './api'
import type { Session } from './types'

// Start a session. On success:
//   1. the answer (the whole open session) goes into the session's cache
//      entry — the session page then opens at once, with no request;
//   2. the program's SUMMARIES are marked stale (the prefix
//      ['assigned-programs', id, 'summary'] reaches the home's entry, which
//      carries `through`, and the program page's): today now has an open
//      session, so the home must say "In progress" and offer Resume. Not
//      awaited — the patient is on their way to the session page, and the
//      home refetches when they come back. The program itself is NOT
//      invalidated (starting changes nothing in it);
//   3. `onStarted` — the page navigates.
// The callback lives on the hook, not in mutate()'s options (the roster's
// lesson, decisions §3): this way it doesn't depend on the component that
// called mutate() still being mounted.
export function useStartSession(onStarted: (session: Session) => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: startSession,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey(session.id), session)
      void queryClient.invalidateQueries({
        queryKey: [...assignedProgramQueryKey(session.assignedProgramId), 'summary'],
      })
      onStarted(session)
    },
  })
}