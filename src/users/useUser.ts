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
import { fetchUser, userQueryKey } from './api'

// Same thin-wrapper shape as useClinic — parameterized by id, reading
// from (and, via setQueryData/invalidateQueries elsewhere, written to)
// the per-user cache entry userQueryKey(id) identifies.
// `enabled` (default true) lets a page switch the query off — the patient
// page does, the moment its practitioner leaves the care team, so the
// profile is never fetched again on the way out (see useLeaveCareTeam).
export function useUser(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: userQueryKey(id),
    queryFn: () => fetchUser(id),
    enabled,
  })
}