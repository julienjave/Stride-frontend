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