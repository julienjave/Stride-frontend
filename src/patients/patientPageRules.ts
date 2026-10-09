import type { AssignedProgram } from '@/assigned-programs/types'
import type { CareTeamEntry } from './types'

// Pure rules behind the patient page — the same split as roster.ts: the
// page only calls these, the tests check them with plain values.

// --- PROGRAMS ----------------------------------------------------------------

// The words shown for each status. A Record keyed by the status type means
// adding a status to AssignedProgram['status'] without a label here is a
// COMPILE error, not a blank badge discovered later.
export const PROGRAM_STATUS_LABELS: Record<AssignedProgram['status'], string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

// What a practitioner opening the page needs first: what the patient is
// doing NOW. So: active, then on hold, then the finished ones (completed,
// cancelled); within each group, the most recently started first.
const STATUS_ORDER: Record<AssignedProgram['status'], number> = {
  active: 0,
  on_hold: 1,
  completed: 2,
  cancelled: 3,
}

// Returns a new array (the input is cached data — see sortByName).
// startDate is 'YYYY-MM-DD', so comparing the strings compares the dates:
// that format sorts alphabetically in date order, by design.
export function sortProgramsForPatientPage<T extends AssignedProgram>(
  programs: readonly T[],
): T[] {
  return [...programs].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      b.startDate.localeCompare(a.startDate),
  )
}

// --- CARE TEAM ---------------------------------------------------------------

// Current members first, longest-serving first (who has known the patient
// longest); then, when the history is shown, past members, most recently
// ended first. startedAt / endsAt are full ISO timestamps, which also sort
// correctly as strings (same format, same time zone 'Z').
export function sortCareTeam(entries: readonly CareTeamEntry[]): CareTeamEntry[] {
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

// Today as 'YYYY-MM-DD' in the viewer's time zone — the earliest day the
// "Until" field accepts (its `min`). Built from the local parts, not from
// toISOString(), which is UTC and can be "yesterday" or "tomorrow" around
// midnight. `now` is a parameter so tests can pin it.
export function localDateString(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
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