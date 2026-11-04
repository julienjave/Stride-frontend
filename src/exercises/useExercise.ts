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
import { fetchExercise, exerciseQueryKey } from './api'

// Same thin-wrapper shape as useClinic — reads from (and, on the photos
// screen, gets written to via setQueryData after each upload/reorder/
// delete) the per-exercise cache entry exerciseQueryKey(id) identifies.
//
// enabled defaults to true (every existing caller's behavior is
// unchanged) — added for NewProgramExercisePage, which can't call this
// hook conditionally (React's rules of hooks) but genuinely shouldn't
// fetch anything until an exercise has actually been picked from the
// library. Passing enabled: false there, with some placeholder id,
// skips the request entirely rather than fetching data nothing needs yet.
export function useExercise(id: number, enabled = true) {
  return useQuery({
    queryKey: exerciseQueryKey(id),
    queryFn: () => fetchExercise(id),
    enabled,
  })
}