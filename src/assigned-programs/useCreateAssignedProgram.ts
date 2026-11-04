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
  assignedProgramQueryKey,
  assignedProgramsListQueryKey,
  createAssignedProgram,
} from './api'
import type { AssignedProgramDetail } from './types'

// Assigning a program, and the cache work that follows. What happens on
// screen next (going to the new program's page) is the PAGE's decision,
// passed in as onCreated — the same split as useJoinCareTeam: the hook knows
// the data, the page knows the routes.
//
// onCreated is given to useMutation (a hook-level callback), not to
// mutate(): TanStack Query runs mutate()'s callbacks only while the
// component that called it is still mounted, the hook's always (see
// deep-dive §9.1).
export function useCreateAssignedProgram(onCreated: (program: AssignedProgramDetail) => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAssignedProgram,
    onSuccess: (program) => {
      // The answer IS the full program (the same shape as GET
      // /assigned-programs/:id), so it goes straight into that cache entry:
      // the program page opens without a second request.
      queryClient.setQueryData(assignedProgramQueryKey(program.id), program)
      // Every list now lacks it — the Programs page's Assigned tab and the
      // patient's own list, which sits under the same prefix
      // (patientAssignedProgramsQueryKey). Marked stale, not patched: a
      // list row has its own shape (`assigner`), and the server builds it.
      // Not awaited: the page we're going to doesn't show those lists, so
      // making the button wait for their refetch would only delay it.
      void queryClient.invalidateQueries({ queryKey: assignedProgramsListQueryKey })
      onCreated(program)
    },
  })
}