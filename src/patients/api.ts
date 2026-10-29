import { apiRequest } from '@/api/client'
import type { CreatedUser } from '@/users/types'
import type { InvitePatientFormValues } from './schemas'
import type { AddCareTeamMemberInput, CareTeamCandidate, CareTeamEntry, DirectoryPatient } from './types'
import { endOfLocalDay } from './patientPageRules'

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

// A patient's care team. `includeEnded` is part of the key (like
// usersListQueryKey's includeInactive): with and without the history are
// two different answers, and each must have its own cache entry.
// Invalidating ['care-team', patientId] refreshes both.
export function careTeamQueryKey(patientId: number, includeEnded: boolean) {
  return ['care-team', patientId, includeEnded] as const
}

// GET /users/:id/care-team[?includeEnded=true] — who treats this patient
// (directory level: any practitioner sharing a clinic may ask, so a care-team
// member certainly can). Without the flag, only the current members.
export function fetchCareTeam(patientId: number, includeEnded: boolean) {
  return apiRequest<CareTeamEntry[]>(
    `/users/${patientId}/care-team${includeEnded ? '?includeEnded=true' : ''}`,
  )
}

// Who could be added to the care team. The key sits UNDER
// ['care-team', patientId] on purpose: invalidating the care team after an
// add or an end (a prefix match) refreshes the candidates' "on the team"
// flags too, with no extra line.
export function careTeamCandidatesQueryKey(patientId: number) {
  return ['care-team', patientId, 'candidates'] as const
}

// GET /users/:id/care-team/candidates — the practitioners of the PATIENT's
// clinics (backend: CareTeamService.listCandidates). For an admin or a
// practitioner sharing a clinic with the patient.
export function fetchCareTeamCandidates(patientId: number) {
  return apiRequest<CareTeamCandidate[]>(`/users/${patientId}/care-team/candidates`)
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
// `allowPossibleDuplicate`: the practitioner saw the possible-duplicate
// warning and chose to invite anyway (decisions §27). Sent only then — an
// ordinary invitation's body is unchanged.
export function invitePatient(values: InvitePatientFormValues, allowPossibleDuplicate = false) {
  return apiRequest<CreatedUser>('/users', {
    method: 'POST',
    body: {
      role: 'patient',
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      dateOfBirth: values.dateOfBirth,
      clinicId: Number(values.clinicId),
      ...(allowPossibleDuplicate && { allowPossibleDuplicate: true }),
    },
  })
}

// POST /users/:id/care-team/:practitionerId/end — ends a care-team link
// (links are ended, never deleted: the history stays). A practitioner may
// end only their OWN link ("Leave care team"); an admin, anyone's. The
// answer is the ended link.
export function endCareTeamMembership(patientId: number, practitionerId: number) {
  return apiRequest<CareTeamEntry>(`/users/${patientId}/care-team/${practitionerId}/end`, {
    method: 'POST',
  })
}

// POST /users/:id/care-team with a practitionerId — "add a colleague" (a
// practitioner) or "add someone" (an admin, for whom it's required). The
// same endpoint as "join", with the person named. Optional fields are LEFT
// OUT when empty (not sent as '' — see joinCareTeam):
//   - reason, trimmed;
//   - endsAt, the END of the chosen day in the viewer's time zone — the
//     backend stores a moment and refuses one in the past, so "until
//     Friday" must mean "until Friday night", not "Friday 00:00" (which
//     would end the cover before Friday's work even starts).
export function addCareTeamMember(patientId: number, input: AddCareTeamMemberInput) {
  const reason = input.reason.trim()
  return apiRequest<CareTeamEntry>(`/users/${patientId}/care-team`, {
    method: 'POST',
    body: {
      practitionerId: input.practitionerId,
      ...(reason && { reason }),
      ...(input.until && { endsAt: endOfLocalDay(input.until) }),
    },
  })
}