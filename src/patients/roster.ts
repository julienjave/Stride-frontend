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

import { MIN_SEARCH_LENGTH } from './api'
import type { ClinicRef } from './types'

// Pure functions behind the roster screens — no React, no fetching, so each
// rule is tested directly with plain values (roster.test.ts) instead of
// through a rendered page. The components only call them.

// --- SORTING -----------------------------------------------------------------

interface Named {
  firstName: string
  lastName: string
}

// "My patients" sorted the way a paper roster is: by last name, then first
// name. The backend returns them in no particular order (the query has no
// ORDER BY — a set of ids turned into users), and an order that changes
// between visits makes a list impossible to scan.
//
// localeCompare with sensitivity 'base' compares like a person would:
// "émile" sorts with "Emile", and case doesn't matter ("de Vries" next to
// "De Vries") — a plain `<` would put every lowercase name after every
// capitalised one, and accented letters after "z".
//
// Returns a NEW array: `.sort()` sorts in place, and the array passed in is
// TanStack Query's cached data — mutating it would quietly reorder the
// cache behind React's back.
export function sortByName<T extends Named>(people: readonly T[]): T[] {
  return [...people].sort(
    (a, b) =>
      a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' }) ||
      a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' }),
  )
}

// --- CLINICS -----------------------------------------------------------------

// The clinic filter's value: 'all', or a clinic id as a string (a select's
// value is always a string — see users/schemas.ts).
export const ALL_CLINICS = 'all'

// Keeps the patients who attend the chosen clinic, or everyone for 'all'.
export function filterByClinic<T extends { clinics: readonly ClinicRef[] }>(
  patients: readonly T[],
  clinicFilter: string,
): T[] {
  if (clinicFilter === ALL_CLINICS) return [...patients]
  const clinicId = Number(clinicFilter)
  return patients.filter((patient) =>
    patient.clinics.some((clinic) => clinic.id === clinicId),
  )
}

// Is this a clinic the practitioner does NOT work at (roadmap Phase 6.5,
// "Roster badges")? `myClinicIds` comes from /auth/me. `false` when no list
// is given: "unknown" must never be drawn as "not mine" — the directory
// search passes none, its clinics being shared ones by definition.
export function isOtherClinic(
  clinic: ClinicRef,
  myClinicIds: readonly number[] | undefined,
): boolean {
  return myClinicIds !== undefined && !myClinicIds.includes(clinic.id)
}

// Does any of these patients attend a clinic I don't work at? Decides
// whether the page shows the one-line key explaining the dashed badges —
// a key for something that isn't on screen would only be noise.
export function showsOtherClinic(
  patients: readonly { clinics: readonly ClinicRef[] }[],
  myClinicIds: readonly number[],
): boolean {
  return patients.some((patient) =>
    patient.clinics.some((clinic) => isOtherClinic(clinic, myClinicIds)),
  )
}

// --- ACCOUNTS ------------------------------------------------------------------

// "My patients" split by account (decisions §22): the ACTIVE ones — the
// everyday list — and the DEACTIVATED ones, still on my care team (their
// record is still mine to read) but behind "Show N deactivated patients".
// Each half sorted by name. One pass over one request
// (GET /users?includeInactive=true), so the switch can say how many are
// hidden without a second request.
export function splitByAccount<T extends Named & { isActive: boolean }>(
  patients: readonly T[],
): { active: T[]; deactivated: T[] } {
  const sorted = sortByName(patients)
  return {
    active: sorted.filter((patient) => patient.isActive),
    deactivated: sorted.filter((patient) => !patient.isActive),
  }
}

// --- DIRECTORY SEARCH ------------------------------------------------------

// What the search box's text becomes in the request: trimmed, and '' (= no
// filter, the default list) while it's shorter than MIN_SEARCH_LENGTH.
// Trimming first means "  a" counts as one character, not three, and a
// trailing space typed after a name doesn't start a new request for the
// "same" search.
export function directorySearchTerm(input: string): string {
  const trimmed = input.trim()
  return trimmed.length >= MIN_SEARCH_LENGTH ? trimmed : ''
}

// --- INVITING ----------------------------------------------------------------

// Turns what the practitioner typed in the search box into the invite
// form's starting names, so a search that found nobody leads to a form
// already half filled in: "Marie Martin" → Marie / Martin.
//
// The FIRST word is the first name and everything after it the last name,
// because compound surnames are more common than compound first names in
// what people type ("Ana de la Cruz" → Ana / de la Cruz). It's only a
// starting point: both fields stay editable, and "Jean Pierre Dupont"
// simply needs one correction.
export function namesFromSearch(input: string): Named {
  const [firstName = '', ...rest] = input.trim().split(/\s+/)
  return { firstName, lastName: rest.join(' ') }
}