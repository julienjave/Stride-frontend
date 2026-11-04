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

import { useQuery } from '@tanstack/react-query'
import { assignedProgramQueryKey, fetchAssignedProgram } from './api'

// One program in full — workouts, exercises, schedule versions — for its
// page, and for "Assign again" (the program to continue). The same cache
// entry the assign form fills with its answer (useCreateAssignedProgram),
// so the page opens at once after assigning. (A 404 isn't retried: the
// app's QueryClient gives up at once on 4xx — api/queryClient.ts.)
// `enabled` (default true): the assign-again page skips a link whose id
// isn't a number.
export function useAssignedProgram(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: assignedProgramQueryKey(id),
    queryFn: () => fetchAssignedProgram(id),
    enabled,
  })
}