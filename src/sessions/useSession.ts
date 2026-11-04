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
import { fetchSession, sessionQueryKey } from './api'

// One session, for its page. Usually already in the cache when the page
// opens: starting writes its answer there (useStartSession). `enabled`
// lets the page skip an address whose id isn't a number.
export function useSession(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: sessionQueryKey(id),
    queryFn: () => fetchSession(id),
    enabled,
  })
}