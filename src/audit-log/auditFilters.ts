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

import { isCalendarDate } from '@/common/calendarDate'
import { AUDIT_KINDS, type AuditKind } from './types'

// The audit log's filters live in the page's ADDRESS (?kind=view&about=6…):
// a filtered view can be bookmarked or sent to a colleague, Back returns to
// the previous filters, and a reload keeps them. This file is the three
// conversions, all pure:
//   address → filters  (readFilters — anything malformed is dropped, the
//                       address is typed by people and links)
//   filters → address  (writeFilters)
//   filters → the API  (toQuery — days become the instants the backend asks)

export interface AuditLogFilters {
  kind: AuditKind | null
  action: string | null
  // Who acted, and whom the entry is about (user ids).
  performedBy: number | null
  targetUserId: number | null
  // Calendar days in the VIEWER's time zone, YYYY-MM-DD, both included.
  from: string | null
  to: string | null
  page: number
}

export const NO_FILTERS: AuditLogFilters = {
  kind: null,
  action: null,
  performedBy: null,
  targetUserId: null,
  from: null,
  to: null,
  page: 1,
}

// Every value a string: it becomes the request's search string as is.
export type AuditLogQuery = Record<string, string>

export const PAGE_SIZE = 20

// The address's names — short, readable in a shared link.
const PARAM = {
  kind: 'kind',
  action: 'action',
  performedBy: 'by',
  targetUserId: 'about',
  from: 'from',
  to: 'to',
  page: 'page',
} as const

// A positive whole number written plainly ("6", not "06", "6.0" or "-6").
function positiveId(value: string | null): number | null {
  return value !== null && /^[1-9]\d*$/.test(value) ? Number(value) : null
}

function isKind(value: string | null): value is AuditKind {
  return AUDIT_KINDS.some((kind) => kind === value)
}

export function readFilters(params: URLSearchParams): AuditLogFilters {
  const kind = params.get(PARAM.kind)
  const action = params.get(PARAM.action)
  const from = params.get(PARAM.from)
  const to = params.get(PARAM.to)
  return {
    kind: isKind(kind) ? kind : null,
    action: action ? action : null,
    performedBy: positiveId(params.get(PARAM.performedBy)),
    targetUserId: positiveId(params.get(PARAM.targetUserId)),
    from: from !== null && isCalendarDate(from) ? from : null,
    to: to !== null && isCalendarDate(to) ? to : null,
    page: positiveId(params.get(PARAM.page)) ?? 1,
  }
}

// Only what is set; page 1 is the default, so it isn't written.
export function writeFilters(filters: AuditLogFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.kind) params.set(PARAM.kind, filters.kind)
  if (filters.action) params.set(PARAM.action, filters.action)
  if (filters.performedBy) params.set(PARAM.performedBy, String(filters.performedBy))
  if (filters.targetUserId) params.set(PARAM.targetUserId, String(filters.targetUserId))
  if (filters.from) params.set(PARAM.from, filters.from)
  if (filters.to) params.set(PARAM.to, filters.to)
  if (filters.page > 1) params.set(PARAM.page, String(filters.page))
  return params
}

// A filter changed: back to page 1 — page 4 of the old results may not
// exist in the new ones.
export function changeFilter(
  filters: AuditLogFilters,
  change: Partial<Omit<AuditLogFilters, 'page'>>,
): AuditLogFilters {
  return { ...filters, ...change, page: 1 }
}

export function hasFilters(filters: AuditLogFilters): boolean {
  return (
    filters.kind !== null ||
    filters.action !== null ||
    filters.performedBy !== null ||
    filters.targetUserId !== null ||
    filters.from !== null ||
    filters.to !== null
  )
}

// YYYY-MM-DD compares as text the way it compares as dates.
export function rangeProblem(filters: AuditLogFilters): string | null {
  return filters.from !== null && filters.to !== null && filters.from > filters.to
    ? 'The start date must be on or before the end date.'
    : null
}

// The first moment of a calendar day in the VIEWER's time zone.
// `new Date(year, monthIndex, day)` is local time — so in Paris "2031-03-10"
// is 2031-03-09T23:00:00Z, in Montreal 2031-03-10T04:00:00Z. Day + 1 rolls
// over months and years by itself (31 Dec + 1 = 1 Jan), and a day 23 or 25
// hours long (the clocks changing) is handled by the Date, not by us.
function localDayStart(day: string, plusDays = 0): Date {
  const [year, month, date] = day.split('-').map(Number)
  return new Date(year, month - 1, date + plusDays)
}

// What GET /audit-logs receives. The days become INSTANTS: `from` = the
// first day's start, `before` = the start of the day AFTER the last one (the
// backend's range is [from, before) — so the whole last day is in, and not
// one moment of the next).
export function toQuery(filters: AuditLogFilters): AuditLogQuery {
  const query: AuditLogQuery = {
    page: String(filters.page),
    limit: String(PAGE_SIZE),
  }
  if (filters.kind) query.kind = filters.kind
  if (filters.action) query.action = filters.action
  if (filters.performedBy) query.performedBy = String(filters.performedBy)
  if (filters.targetUserId) query.targetUserId = String(filters.targetUserId)
  if (filters.from) query.from = localDayStart(filters.from).toISOString()
  if (filters.to) query.before = localDayStart(filters.to, 1).toISOString()
  return query
}