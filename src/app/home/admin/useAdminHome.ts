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
import { auditLogQueryKey, fetchAuditLog } from '@/audit-log/api'
import type { AuditLogQuery } from '@/audit-log/auditFilters'
import { adminMetricsQueryKey, fetchAdminMetrics } from './api'

// The admin home's two requests, as hooks shared by the sections that show
// them AND the freshness bar above them (Phase 6.5, decided with the person
// 2026-10-29). Two components calling a hook with the same query key share
// ONE cache entry and one request — TanStack Query deduplicates — so the bar
// costs nothing.
//
// Kept current while the page stays open: refetched every minute.
// `refetchInterval` runs only while the tab is VISIBLE (TanStack's
// `refetchIntervalInBackground` is false by default) — a home left open in a
// background tab asks nothing. One SQL statement a minute for the metrics,
// one indexed page of the audit log for the activity.
export const ADMIN_HOME_REFRESH_MS = 60_000

// How many changes the home shows; the audit log has the rest.
export const RECENT_ACTIVITY_ROWS = 5

// The request: page 1 of the CHANGES only (the person's choice, 2026-10-24:
// sign-ins and record views would fill five rows on their own), newest
// first — the backend's order. Built as the audit log's own query (same
// names, same key prefix ['audit-log', …]), so nothing new is needed on the
// backend and anything that refreshes the audit log refreshes this too.
export const RECENT_CHANGES_QUERY: AuditLogQuery = {
  page: '1',
  limit: String(RECENT_ACTIVITY_ROWS),
  kind: 'change',
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: adminMetricsQueryKey,
    queryFn: fetchAdminMetrics,
    refetchInterval: ADMIN_HOME_REFRESH_MS,
  })
}

export function useRecentChanges() {
  return useQuery({
    queryKey: auditLogQueryKey(RECENT_CHANGES_QUERY),
    queryFn: () => fetchAuditLog(RECENT_CHANGES_QUERY),
    refetchInterval: ADMIN_HOME_REFRESH_MS,
  })
}