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

import { useState } from 'react'
import { Link } from 'react-router'
import { LoadError } from '@/common/LoadError'
import { useDebouncedValue } from '@/common/useDebouncedValue'
import { useRetryFocus } from '@/common/useRetryFocus'
import { cn } from '@/lib/utils'
import { DIRECTORY_RESULT_LIMIT, MIN_SEARCH_LENGTH } from './api'
import { DirectoryPatientRow } from './DirectoryPatientRow'
import { directorySearchTerm, namesFromSearch } from './roster'
import { useDirectoryPatients } from './useDirectoryPatients'
import { ListSkeleton } from '@/common/Loading'

// The same delay as the exercise library's search: long enough that typing
// "martin" at normal speed sends one request, not six; short enough that
// the results feel immediate once you stop.
const SEARCH_DEBOUNCE_MS = 300

// "Add patient" (/practitioner/patients/add) — SEARCH FIRST, then invite
// (decisions §3, roster design, 2026-10-08).
//
// "Adding a patient" means one of two things, and this page makes the
// practitioner find out which before choosing:
//   - they're already in Stride, in one of my clinics → "Add to my
//     patients" (= join their care team);
//   - they aren't → "Invite a new patient" (a new account + an invitation
//     email).
// Looking first is how health records avoid DUPLICATE patients: an
// account created for someone who already has one splits their history in
// two (see deferred-improvements.md, "Duplicate patient accounts"). The
// backend only refuses a second account with the exact same email.
export function AddPatientPage() {
  const [searchInput, setSearchInput] = useState('')
  const debouncedInput = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)
  // What's actually sent: '' (the default list) until 2 characters.
  const search = directorySearchTerm(debouncedInput)

  const directory = useDirectoryPatients(search)
  const { data: patients, isLoading, isError, isPlaceholderData } = directory
  // After a "Try again" that worked, focus goes to the page's heading. Not
  // `isSuccess` alone: during a retry the previous results stay on screen as
  // placeholder data, which TanStack reports as success (see
  // useDirectoryPatients) — the answer isn't in yet.
  const heading = useRetryFocus<HTMLHeadingElement>(
    'the search results',
    directory.isSuccess && !isPlaceholderData,
  )

  // The name of the patient just added, for the confirmation line. Kept
  // until the next addition replaces it.
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  // Whether the box holds 1 character: not enough to search yet. Computed
  // from the RAW input (not the debounced one) so the hint appears and
  // disappears as you type, with no delay.
  const tooShortToSearch =
    searchInput.trim().length > 0 && searchInput.trim().length < MIN_SEARCH_LENGTH

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-4 px-4">
      <div className="space-y-1">
        <Link to="/practitioner/patients" className="text-sm text-muted-foreground hover:underline">
          ← My patients
        </Link>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Add a patient
        </h1>
        <p className="text-sm text-muted-foreground">
          First, check whether they're already in Stride: search the patients of your clinics by
          name.
        </p>
      </div>

      {lastAdded && (
        // role="status": a screen reader announces this line when it
        // appears, without moving the focus — the person may want to add
        // someone else next.
        <p
          role="status"
          className="rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm"
        >
          {lastAdded} is now in your patients.{' '}
          <Link to="/practitioner/patients" className="font-medium underline">
            Go to my patients
          </Link>
        </p>
      )}

      <div className="space-y-1">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by first or last name…"
          aria-label="Search patients by name"
          // The page has one job, and this field is how it starts.
          autoFocus
          // The backend refuses more than 100 characters (DirectoryQueryDto);
          // no name needs more.
          maxLength={100}
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        {tooShortToSearch && (
          <p className="text-xs text-muted-foreground">
            Type at least {MIN_SEARCH_LENGTH} letters to search.
          </p>
        )}
      </div>

      {isLoading && <ListSkeleton label="Loading the patients…" avatar />}

      {isError && <LoadError what="the search results" queries={[directory]} />}

      {patients && patients.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {search
            ? `No patient in your clinics matches "${search}".`
            : 'Your clinics have no patients yet.'}
        </p>
      )}

      {patients && patients.length > 0 && (
        <ul
          // Dimmed while the next search's results load (the previous ones
          // stay on screen meanwhile — keepPreviousData in the hook).
          className={cn(
            'divide-y divide-border rounded-lg border transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {patients.map((patient) => (
            <DirectoryPatientRow
              key={patient.id}
              patient={patient}
              onAdded={() => setLastAdded(`${patient.firstName} ${patient.lastName}`)}
            />
          ))}
        </ul>
      )}

      {/* The backend sends at most 50 rows. Exactly 50 may mean "and
          more": say so, rather than let the list look complete. */}
      {patients && patients.length === DIRECTORY_RESULT_LIMIT && (
        <p className="text-xs text-muted-foreground">
          Showing the first {DIRECTORY_RESULT_LIMIT} patients. Type a name to narrow the list.
        </p>
      )}

      <div className="rounded-lg border border-dashed p-4 text-sm">
        <p className="font-medium">Not in the list?</p>
        <p className="mb-2 text-muted-foreground">
          If they're new to your clinic, invite them: they'll get an email to set up their account,
          and you'll be on their care team.
        </p>
        <Link to={inviteLink(search)} className="font-medium underline">
          Invite a new patient
        </Link>
      </div>
    </div>
  )
}

// The invite form's address, carrying the searched name so the form starts
// half filled in ("Marie Martin" → ?firstName=Marie&lastName=Martin). Only
// a real search term is carried over — not a single stray letter — and an
// empty part is left out of the address rather than sent as "lastName=".
function inviteLink(search: string): string {
  const { firstName, lastName } = namesFromSearch(search)
  const params = new URLSearchParams()
  if (firstName) params.set('firstName', firstName)
  if (lastName) params.set('lastName', lastName)
  const query = params.toString()
  return `/practitioner/patients/invite${query ? `?${query}` : ''}`
}