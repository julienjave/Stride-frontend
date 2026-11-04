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
import {
  addScheduleVersion,
  assignedProgramQueryKey,
  assignedProgramsListQueryKey,
} from './api'
import type { AssignedProgramDetail, ScheduleVersionInput } from './types'

// A new schedule version — a change, a pause or a resume — and the cache
// work after it:
//   - the answer IS the full program (every version included), so it
//     replaces the cached one directly (setQueryData): the new schedule
//     shows at once, with no second request for the program;
//   - the SUMMARY is now wrong (which days are scheduled, paused, missed
//     depends on the versions), so it's marked stale and refetched. Its key
//     is under the program's — ['assigned-programs', id, 'summary', today]
//     — and invalidating the prefix ['assigned-programs', id, 'summary']
//     refreshes it whatever `today` it was asked with, WITHOUT refetching
//     the program just written (invalidating ['assigned-programs', id]
//     would);
//   - the lists show each program's schedule ("3× a week"), so they're
//     marked stale too.
// AWAITED, so "Saving…" lasts until the progress below matches the new
// schedule — the form then closes on a page that is already right.
export function useAddScheduleVersion(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ScheduleVersionInput) => addScheduleVersion(id, input),
    onSuccess: async (program: AssignedProgramDetail) => {
      queryClient.setQueryData(assignedProgramQueryKey(id), program)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...assignedProgramQueryKey(id), 'summary'] }),
        queryClient.invalidateQueries({ queryKey: assignedProgramsListQueryKey }),
      ])
    },
  })
}