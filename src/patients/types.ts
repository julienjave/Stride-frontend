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

// One care-team link, as POST /users/:id/care-team answers it (and, later,
// GET /users/:id/care-team lists them — the patient page's care team
// section). Mirrors the backend's CareTeamEntry; the dates arrive as ISO
// strings, since JSON has no date type.
export interface CareTeamEntry {
  id: number
  patientId: number
  practitioner: PersonRef & { avatarUrl: string | null }
  startedAt: string
  endsAt: string | null
  // Computed by the backend with the SAME rule as clinical access (period
  // AND a shared clinic), so "active" here always means "has access now".
  isActive: boolean
  reason: string | null
  createdBy: PersonRef | null
  endedBy: PersonRef | null
}