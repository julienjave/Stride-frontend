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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ALERTS_PREFIX, reviewProgramAlert } from './api'

// "Mark as reviewed" on a program's attendance alert (2026-10-19). Not
// optimistic, like the session review: the server decides what is
// reviewed. After it, every alerts query is stale — the banner disappears
// with the alert, and the home's list no longer has the row.
export function useReviewProgramAlert(programId: number, today: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reviewProgramAlert(programId, today),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALERTS_PREFIX }),
  })
}