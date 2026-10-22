// An entry's `details`, made readable. Its shape depends on the action — the
// backend writes, among others:
//   { changes: { title: { from: 'Knee', to: 'Knee, phase 2' } } }   (edits)
//   { record: { …the request as validated… } }                       (creations)
//   { programIds: [7, 8] } / { entryIds: [3] } / { sessionIds: […] } (reads)
//   { practitionerId: 4, reason: '…', startedAt: '…' }               (care team)
// So this file knows ONE shape — `changes`, shown as a before → after table —
// and shows every other key as "label: value". Anything not plain (a nested
// object, a list of objects) is shown as compact JSON: complete, if not
// pretty. The page also offers the raw entry, exactly as stored.
//
// Dates (the person's request, 2026-10-22) read like the entry's own time:
// a MOMENT ("2026-10-21T17:23:34.580Z") as "21 Oct 2026, 19:23" in the
// viewer's zone, a calendar DAY ("2031-03-10") as "10 Mar 2031", never
// shifted by a zone. Inside compact JSON they stay as stored — and the raw
// entry keeps them exact.

import { isCalendarDate } from '@/common/calendarDate'
import { formatEntryDay, formatEntryMoment } from './auditWording'

export interface ChangeRow {
  field: string
  from: string
  to: string
}

// For tests: the page passes neither, so the viewer's own are used.
export interface DateFormat {
  locale?: string
  timeZone?: string
}

// A moment as the backend writes one: a date, a time, an offset. The
// pattern decides the SHAPE, `Date.parse` that it exists (no 13th month).
// The anchors (^ $) survive a mutation run — in V8 `Date.parse` already
// refuses "on 2031-…" and "…Z later" — but the ECMAScript spec leaves
// non-ISO strings to each engine, so it's the anchors that make "only a
// whole timestamp" true in every browser.
const MOMENT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

function formatText(value: string, dates: DateFormat): string {
  if (MOMENT_PATTERN.test(value) && !Number.isNaN(Date.parse(value))) {
    return formatEntryMoment(value, dates.locale, dates.timeZone)
  }
  if (isCalendarDate(value)) return formatEntryDay(value, dates.locale)
  return value
}

export type DetailItem =
  | { type: 'changes'; rows: ChangeRow[] }
  | { type: 'value'; label: string; value: string }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// "careTeamLinkId" → "Care team link ID", "programIds" → "Program IDs".
export function keyLabel(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\bid(s?)\b/g, (_word, plural: string) => `ID${plural}`)
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// One value as text. Ids (a key ending in "Id" / "Ids") read "#7"; an empty
// list "none"; null "—" (nothing was there — e.g. a "from" before a first
// value was set).
function formatValue(value: unknown, isId: boolean, dates: DateFormat): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'none'
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return value.map((item) => formatValue(item, isId, dates)).join(', ')
    }
    return JSON.stringify(value)
  }
  if (typeof value === 'number') return isId ? `#${value}` : String(value)
  if (typeof value === 'string') return formatText(value, dates)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  // An object — details come from JSON, so nothing else is left.
  return JSON.stringify(value)
}

const isIdKey = (key: string) => /Ids?$/.test(key)

// A `changes` object whose every value is { from, to } — anything else under
// that key is shown like any other value.
function changeRows(changes: unknown, dates: DateFormat): ChangeRow[] | null {
  if (!isPlainObject(changes)) return null
  const rows: ChangeRow[] = []
  for (const [field, change] of Object.entries(changes)) {
    if (!isPlainObject(change) || !('from' in change) || !('to' in change)) return null
    rows.push({
      field: keyLabel(field),
      from: formatValue(change.from, isIdKey(field), dates),
      to: formatValue(change.to, isIdKey(field), dates),
    })
  }
  return rows
}

export function describeDetails(details: unknown, dates: DateFormat = {}): DetailItem[] {
  if (details === null || details === undefined) return []
  if (!isPlainObject(details)) {
    return [{ type: 'value', label: 'Details', value: formatValue(details, false, dates) }]
  }
  const items: DetailItem[] = []
  for (const [key, value] of Object.entries(details)) {
    const rows = key === 'changes' ? changeRows(value, dates) : null
    items.push(
      rows
        ? { type: 'changes', rows }
        : {
            type: 'value',
            label: keyLabel(key),
            value: formatValue(value, isIdKey(key), dates),
          },
    )
  }
  return items
}