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

import { apiRequest } from '@/api/client'
import type { AuditActionOption, AuditLogPage } from './types'
import type { AuditLogQuery } from './auditFilters'

// One cache entry per exact query: going back to page 1 of the same filters
// is served from the cache, a different filter is a different entry.
export function auditLogQueryKey(query: AuditLogQuery) {
  return ['audit-log', query] as const
}

export const auditActionsQueryKey = ['audit-log', 'actions'] as const

// The query object becomes the URL's search string. Every value is already a
// string (auditFilters.ts builds it); absent filters are simply not there.
export function fetchAuditLog(query: AuditLogQuery) {
  const search = new URLSearchParams(query).toString()
  return apiRequest<AuditLogPage>(`/audit-logs?${search}`)
}

export function fetchAuditActions() {
  return apiRequest<AuditActionOption[]>('/audit-logs/actions')
}