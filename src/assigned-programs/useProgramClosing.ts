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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignedProgramQueryKey,
  assignedProgramsListQueryKey,
  closeAssignedProgram,
  closingPreviewQueryKey,
  fetchClosingPreview,
} from './api'

// What cancelling / completing would do today — asked only while a
// confirmation dialog is open (`enabled`), and asked AGAIN each time it
// opens (staleTime 0): a patient may have started a session since, which
// changes the answer ("deletes it" → "ends it"). The app's 30 s default
// would show a stale promise.
export function useClosingPreview(id: number, today: string, { enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: closingPreviewQueryKey(id, today),
    queryFn: () => fetchClosingPreview(id, today),
    enabled,
    staleTime: 0,
  })
}

// Cancelling or completing, and the cache work after it. Everything under
// the program's key — the program, its summary, its closing preview — is
// marked stale and refetched (a prefix match): the program changed status
// and end date, or was archived (GET still answers an archived program,
// which the page then shows as deleted). Every list too: the program left
// "active", or left the lists altogether.
//
// AWAITED in onSuccess, so the dialog's "Cancelling…" lasts until the page
// can show the result — not a moment of the old state in between. (Not
// setQueryData with the answer: the answer is null when archived, and the
// summary needs refreshing anyway.)
//
// Nothing closes the dialog by hand: once the refetched program is closed
// or deleted, the page stops drawing the actions — and their dialog goes
// with them. (A mutation check showed a "close the dialog" callback here
// could never be seen.)
export function useCloseAssignedProgram(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ action, today }: { action: 'cancel' | 'complete'; today: string }) =>
      closeAssignedProgram(id, action, today),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignedProgramQueryKey(id) }),
        queryClient.invalidateQueries({ queryKey: assignedProgramsListQueryKey }),
      ])
    },
  })
}