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

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditActionsQueryKey, auditLogQueryKey, fetchAuditActions, fetchAuditLog } from './api'
import type { AuditLogQuery } from './auditFilters'

// One page of the log. `placeholderData: keepPreviousData`: while the next
// page (or another filter) loads, the PREVIOUS results stay on screen —
// `isPlaceholderData` says so, and the page dims them — rather than the list
// vanishing into "Loading…" on every click (the exercise library does the
// same). `enabled: false` while the filters can't be sent (a backwards date
// range): no request the backend would only refuse.
export function useAuditLog(query: AuditLogQuery, enabled: boolean) {
  return useQuery({
    queryKey: auditLogQueryKey(query),
    queryFn: () => fetchAuditLog(query),
    placeholderData: keepPreviousData,
    enabled,
  })
}

// The action filter's choices. They never change while the app runs (the
// list is part of the backend's code), so they are fetched once.
export function useAuditActions() {
  return useQuery({
    queryKey: auditActionsQueryKey,
    queryFn: fetchAuditActions,
    staleTime: Infinity,
  })
}