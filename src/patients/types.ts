// Shapes the patient-roster screens receive from the care-team endpoints —
// written from the backend's own code (CareTeamService.searchDirectory()
// and findEntryOrThrow()) and the care-team e2e tests, not from the
// generated OpenAPI types, which describe these responses only loosely.

// A clinic as the roster and directory show it: just enough to label a
// badge and to filter by.
export interface ClinicRef {
  id: number
  name: string
}

// One row of GET /directory/patients — the "directory level" of access
// (decisions §3): enough to RECOGNISE a patient, nothing clinical and no
// contact details. Note what is missing on purpose: no email, phone or
// address — a practitioner who isn't on the care team has no reason to
// contact the patient, only to find them.
export interface DirectoryPatient {
  id: number
  firstName: string
  lastName: string
  avatarUrl: string | null
  // The tie-breaker between two people with the same name — the reason it
  // is the one personal detail the directory does include. Can be null in
  // principle (the backend LEFT JOINs patient_profiles), so it's typed so.
  dateOfBirth: string | null
  // Only the clinics this patient shares with ME — never the full list of
  // clinics they attend (that would say more about them than finding them
  // needs).
  sharedClinics: ClinicRef[]
  // Whether I'm already on this patient's care team — i.e. whether they're
  // already in "My patients". Decides the row's action: "Add to my
  // patients", or a link to the patient.
  onMyCareTeam: boolean
}

export interface PersonRef {
  id: number
  firstName: string
  lastName: string
}

// The practitioner of a care-team link: their DIRECTORY fields only (the
// backend's CareTeamPractitioner). Specialties and bio were added for the
// patient's Team page (2026-10-18); never an email, phone or license.
export interface CareTeamPractitioner extends PersonRef {
  avatarUrl: string | null
  specialties: string[]
  bio: string | null
}

// One care-team link, as POST /users/:id/care-team answers it (and, later,
// GET /users/:id/care-team lists them — the patient page's care team
// section). Mirrors the backend's CareTeamEntry; the dates arrive as ISO
// strings, since JSON has no date type.
export interface CareTeamEntry {
  id: number
  patientId: number
  practitioner: CareTeamPractitioner
  // The clinics the practitioner and the patient both belong to now —
  // where they see each other (none left: an ended link's history).
  sharedClinics: ClinicRef[]
  startedAt: string
  endsAt: string | null
  // Computed by the backend with the SAME rule as clinical access (period
  // AND a shared clinic), so "active" here always means "has access now".
  isActive: boolean
  reason: string | null
  createdBy: PersonRef | null
  endedBy: PersonRef | null
}

// One row of GET /users/:id/care-team/candidates — a practitioner who could
// join this patient's care team ("Add a colleague" / the admin's "Add
// someone"). Staff directory fields only: no email, phone or license.
export interface CareTeamCandidate {
  id: number
  firstName: string
  lastName: string
  avatarUrl: string | null
  // Why you'd pick this person ("vestibular rehab").
  specialties: string[]
  // The clinics where they work AND the patient attends — what makes them
  // a possible member (clinical access needs a shared clinic).
  sharedClinics: ClinicRef[]
  // Already on the team (a current link): shown, but can't be picked —
  // the backend would refuse an overlapping link with a 409.
  onCareTeam: boolean
}

// The body of POST /users/:id/care-team when adding SOMEONE (not "join"):
// who, and optionally why and until when.
export interface AddCareTeamMemberInput {
  practitionerId: number
  reason: string
  // A calendar date from the "Until" field ('2026-10-16'), or '' for an
  // open-ended link. Turned into a moment by endOfLocalDay() before sending.
  until: string
}