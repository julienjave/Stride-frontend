import type { AssignedProgram } from '@/assigned-programs/types'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import type { CareTeamEntry } from './types'

// Pure rules behind the patient page — the same split as roster.ts: the
// page only calls these, the tests check them with plain values.

// --- PROGRAMS ----------------------------------------------------------------

// The words shown for each status. A Record keyed by the status type means
// adding a status to AssignedProgram['status'] without a label here is a
// COMPILE error, not a blank badge discovered later.
export const PROGRAM_STATUS_LABELS: Record<AssignedProgram['status'], string> = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// Which programs are CURRENT (always shown) and which are PAST (behind
// "Show N past programs", decided 2026-10-13 and 2026-10-14). Past means
// CLOSED — completed or cancelled: read-only, part of the record. By
// status, not by date: nothing closes a program when its end date passes,
// so an active program past its end still needs the practitioner to close
// it — hiding it would hide that work. (Archived programs never reach the
// page: the list endpoint leaves them out.)
//
// A Record keyed by the status, like the labels: a new status is a COMPILE
// error here until someone decides which group it belongs to — rather than
// silently landing in whichever group a `!== 'active'` test would give it.
const PROGRAM_GROUP: Record<AssignedProgram['status'], 'current' | 'past'> = {
  active: 'current',
  completed: 'past',
  cancelled: 'past',
}

// The two lists, each in the order a practitioner reads it:
//   - current: the most recently started first;
//   - past: the most recently ENDED first — what happened last is what's
//     remembered, and what a new program likely continues. Completed and
//     cancelled are mixed: the order is time, the row says the outcome.
//     Same end date → the later start first.
// The dates are 'YYYY-MM-DD', so comparing the strings compares the dates
// (that format sorts alphabetically in date order, by design). A closed
// program always has an end date (closing sets one); `?? ''` only keeps a
// missing one from crashing the sort — it would go last.
// `filter` returns new arrays, so sorting them in place never touches the
// input (cached data — see sortByName).
export function splitProgramsForPatientPage<T extends AssignedProgram>(
  programs: readonly T[],
): { current: T[]; past: T[] } {
  const current = programs
    .filter((program) => PROGRAM_GROUP[program.status] === 'current')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  const past = programs
    .filter((program) => PROGRAM_GROUP[program.status] === 'past')
    .sort(
      (a, b) =>
        (b.endDate ?? '').localeCompare(a.endDate ?? '') ||
        b.startDate.localeCompare(a.startDate),
    )
  return { current, past }
}

// The line under a program's title on the patient page.
//   - Current: its span, then its status — "September 1, 2026 – December 1,
//     2026 · Active", or "Started September 1, 2026 · Active" when
//     open-ended.
//   - Past: HOW it ended first, then when — "Cancelled · ended October 3,
//     2026 · ran from September 12, 2026". "ended", not "Cancelled October
//     3": the end date is the program's LAST DAY, not the day someone
//     clicked (cancelling on the 4th ends it on the 3rd, so the 4th isn't
//     counted as missed) — the program page's banner says it the same way.
// Calendar dates (`date` columns): formatCalendarDate, never shifted by the
// viewer's time zone. `locale` only so tests can pin it, as there.
export function programRowSummary(
  program: Pick<AssignedProgram, 'status' | 'startDate' | 'endDate'>,
  locale?: string,
): string {
  const label = PROGRAM_STATUS_LABELS[program.status]
  const start = formatCalendarDate(program.startDate, locale)
  if (PROGRAM_GROUP[program.status] === 'past') {
    return program.endDate
      ? `${label} · ended ${formatCalendarDate(program.endDate, locale)} · ran from ${start}`
      : // Not expected (see above) — but never "ended null".
        `${label} · started ${start}`
  }
  return program.endDate
    ? `${start} – ${formatCalendarDate(program.endDate, locale)} · ${label}`
    : `Started ${start} · ${label}`
}

// --- CARE TEAM ---------------------------------------------------------------

// Current members first, longest-serving first (who has known the patient
// longest); then, when the history is shown, past members, most recently
// ended first. startedAt / endsAt are full ISO timestamps, which also sort
// correctly as strings (same format, same time zone 'Z').
// Generic over the entry type (any shape with these three fields), so the
// patient's own Team page sorts its entries — which lack the staff-only
// `reason` — with the same rule.
export function sortCareTeam<T extends Pick<CareTeamEntry, 'isActive' | 'startedAt' | 'endsAt'>>(
  entries: readonly T[],
): T[] {
  return [...entries].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    if (a.isActive) return a.startedAt.localeCompare(b.startedAt)
    return (b.endsAt ?? '').localeCompare(a.endsAt ?? '')
  })
}

// Whether I'm the patient's ONLY current practitioner — the leave dialog
// warns about it: leaving would leave nobody with access to their record.
export function isOnlyActiveMember(entries: readonly CareTeamEntry[], myId: number): boolean {
  const active = entries.filter((entry) => entry.isActive)
  return active.length === 1 && active[0].practitioner.id === myId
}

// --- ADDING SOMEONE ------------------------------------------------------------

// '2026-10-16' (a date input's value) → the LAST moment of that day in the
// viewer's time zone, as the ISO string the backend expects
// ('2026-10-16T21:59:59.999Z' in Paris in summer).
//
// The trick is in the string format: a date-time WITHOUT a zone
// ('2026-10-16T23:59:59.999') is read by `new Date()` as LOCAL time (a
// date alone, '2026-10-16', would be read as UTC midnight — a JavaScript
// rule worth knowing). toISOString() then expresses that local moment in
// UTC, which is how it travels and is stored.
export function endOfLocalDay(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString()
}

// For matching typed text loosely: lower case, accents removed ("Émile" →
// "emile"). NFD splits "é" into "e" + a combining accent; the regex then
// drops the combining marks (Unicode range U+0300–U+036F).
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

// The candidates whose name OR a specialty contains the typed text —
// "sam", "okafor", "sports" all find Sam Okafor (Sports). Done in the
// browser: the list is a clinic's practitioners, a handful, already loaded.
export function filterCandidates<
  T extends { firstName: string; lastName: string; specialties: string[] },
>(candidates: readonly T[], text: string): T[] {
  const query = fold(text.trim())
  if (!query) return [...candidates]
  return candidates.filter((candidate) =>
    [`${candidate.firstName} ${candidate.lastName}`, ...candidate.specialties].some((field) =>
      fold(field).includes(query),
    ),
  )
}