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
import { useCurrentUser } from '@/auth/useCurrentUser'
import { fetchMyCareTeam, myCareTeamQueryKey } from './api'

// The logged-in patient's care team — the list page and the profile page
// read the SAME query, so opening a profile from the list finds it cached
// (no second request, no loading flash). The id comes from /auth/me; until
// it's known the query waits (`enabled`) instead of asking for "undefined".
// In practice the patient's pages render only once /auth/me has answered
// (RequireRole), so `enabled` is a safety net, not a path a test can reach.
export function useMyCareTeam() {
  const { data: me } = useCurrentUser()
  const patientId = me?.id
  return useQuery({
    queryKey: myCareTeamQueryKey(patientId ?? 0),
    queryFn: () => fetchMyCareTeam(patientId ?? 0),
    enabled: patientId !== undefined,
  })
}