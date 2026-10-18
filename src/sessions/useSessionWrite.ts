import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignedProgramQueryKey } from '@/assigned-programs/api'
import { programSessionsQueryKey } from '@/progress/api'
import { sessionQueryKey } from './api'
import type { Session } from './types'

// A write that STARTS or ENDS a session — start, finish, stop, skip. Each
// answers the session as it now is, and each changes what the program's
// summary says about today. So, on success:
//   1. the answer goes into the session's cache entry (the session page, if
//      opened again, shows it with no request);
//   2. the program's SUMMARIES are marked stale — the prefix
//      ['assigned-programs', id, 'summary'] reaches the home's entry (with
//      `through`) and the program page's — and its SESSION LIST (the
//      progress charts, 2026-10-18: a start brings a pain-before score, an
//      ending the check-out). Not awaited: the patient is on their way to
//      another page, which refetches when it shows. The program itself is
//      NOT invalidated (no session write changes it);
//   3. `onDone` — the page navigates.
// The callback lives on the hook, not in mutate()'s options (the roster's
// lesson, decisions §3): it then doesn't depend on the calling component
// still being mounted.
//
// Written for the endings (pass (c)); `useStartSession` (pass (a)) became a
// user of it — one place says what a session write refreshes.
export function useSessionWrite<Input>(
  write: (input: Input) => Promise<Session>,
  onDone: (session: Session) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: write,
    onSuccess: (session) => {
      queryClient.setQueryData(sessionQueryKey(session.id), session)
      void queryClient.invalidateQueries({
        queryKey: [...assignedProgramQueryKey(session.assignedProgramId), 'summary'],
      })
      void queryClient.invalidateQueries({
        queryKey: programSessionsQueryKey(session.assignedProgramId),
      })
      onDone(session)
    },
  })
}