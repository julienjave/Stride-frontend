import { apiRequest } from '@/api/client'
import type { CreatedUser } from '@/users/types'
import type { InvitePatientFormValues } from './schemas'
import type { CareTeamEntry, DirectoryPatient } from './types'

// --- RULES MIRRORED FROM THE BACKEND ----------------------------------------

// The most rows GET /directory/patients ever returns (the backend's
// DIRECTORY_RESULT_LIMIT, in care-team.service.ts). Mirrored here for one
// purpose only: when a response holds exactly this many rows, there may be
// more the backend didn't send, and the page says so ("type a name to
// narrow the list") instead of letting the list look complete.
export const DIRECTORY_RESULT_LIMIT = 50

// Below this many characters the search box doesn't filter: one letter
// matches nearly everyone, so the request would cost a round trip and
// change nothing useful. The page shows the default list (the first 50,
// alphabetically) until the second character.
export const MIN_SEARCH_LENGTH = 2

// --- QUERY KEYS --------------------------------------------------------------

// One cache entry per search term: ['directory-patients', 'mar'] and
// ['directory-patients', 'mart'] are different lists. Invalidating the
// PREFIX ['directory-patients'] (after joining a care team, or inviting a
// patient) marks every one of them stale at once — they all contain an
// `onMyCareTeam` flag that may just have changed.
export function directoryPatientsQueryKey(search: string) {
  return ['directory-patients', search] as const
}

// --- QUERIES -----------------------------------------------------------------

// GET /directory/patients?search=… — patients of MY clinics, directory
// fields only (types.ts). An empty search means "no filter": the backend
// then returns its default list. URLSearchParams does the encoding, so a
// name with a space or an apostrophe ("Marie O'Neil") arrives intact.
export function fetchDirectoryPatients(search: string) {
  const query = search ? `?${new URLSearchParams({ search }).toString()}` : ''
  return apiRequest<DirectoryPatient[]>(`/directory/patients${query}`)
}

// --- MUTATIONS ---------------------------------------------------------------

// POST /users/:id/care-team with no practitionerId = "I join" — the
// backend takes the practitioner from the session, so the frontend never
// has to send (or could fake) whose link this is. The reason is optional:
// an empty one is LEFT OUT of the body rather than sent as '' — the
// backend would store '' as a real reason ("we have a reason and it's
// blank"), which then shows up in the patient's care-team history.
export function joinCareTeam(patientId: number, reason: string) {
  const trimmed = reason.trim()
  return apiRequest<CareTeamEntry>(`/users/${patientId}/care-team`, {
    method: 'POST',
    body: trimmed ? { reason: trimmed } : {},
  })
}

// POST /users as a practitioner. The backend only lets a practitioner
// create PATIENTS, only in one of their own clinics, and puts them on the
// new patient's care team in the same transaction (decisions §3: "whoever
// creates the patient is automatically on the care team"). The account
// has no password: the answer carries the first invitation, emailed to
// the patient so they choose their own.
//
// clinicId arrives as a string, like every <select> value (see
// users/schemas.ts) — converted to the number the backend expects.
export function invitePatient(values: InvitePatientFormValues) {
  return apiRequest<CreatedUser>('/users', {
    method: 'POST',
    body: {
      role: 'patient',
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      dateOfBirth: values.dateOfBirth,
      clinicId: Number(values.clinicId),
    },
  })
}