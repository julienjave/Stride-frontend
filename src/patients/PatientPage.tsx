import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { RecordLoadFailed, RecordNotFound } from '@/common/RecordNotFound'
import { UserAvatar } from '@/common/UserAvatar'
import { useRetryFocus } from '@/common/useRetryFocus'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { InvitationStatus } from '@/invitations/InvitationStatus'
import { MedicalFileLinkCard } from '@/medical-files/MedicalFileLinkCard'
import { MessageButton } from '@/messages/MessageButton'
import { RangeOfMotionLinkCard } from '@/range-of-motion/RangeOfMotionLinkCard'
import { ProfileFields } from '@/users/ProfileFields'
import { useUser } from '@/users/useUser'
import { CareTeamSection } from './CareTeamSection'
import { ClinicBadges, OtherClinicsKey } from './ClinicBadges'
import { PatientProgramsSection } from './PatientProgramsSection'
import { deactivatedPatientNotice } from './patientPageRules'
import { showsOtherClinic } from './roster'
import { Loading } from '@/common/Loading'
import { showSuccess } from '@/snackbars/snackbarStore'

// The practitioner's patient page (/practitioner/patients/:id) — decided
// 2026-10-08 (decisions §3, "Patient page"). Top to bottom, in the order a
// practitioner needs it: who this is, their programs, the way into their
// medical file (its own page — decisions §8) and their range of motion
// (decisions §36), their care team, their
// invitation (until they've set up their account), and their profile.
//
// Only the patient's CARE TEAM sees it: GET /users/:id answers anyone else
// with a 403, and the page explains that instead of a generic error.
export function PatientPage() {
  const { id } = useParams<{ id: string }>()
  const patientId = Number(id)

  // An address whose id isn't a patient id can't be anyone's record: "Patient
  // not found", without asking. (A real id of someone I may not see is the
  // backend's 403 — "You're not on this patient's care team", below.)
  if (!id || !Number.isInteger(patientId) || patientId < 1) {
    return <RecordNotFound noun="patient" links={WAYS_OUT} />
  }

  // key={patientId}: going from one patient's page to another's (same
  // route, new :id) mounts a FRESH view, so no state — the "left" flag,
  // an open dialog, the past-members toggle — carries over to the next
  // patient. The same idea as InvitationSentNotice's key.
  return <PatientView key={patientId} patientId={patientId} />
}

const WAYS_OUT: [{ to: string; label: string }] = [
  { to: '/practitioner/patients', label: 'My patients' },
]

function PatientView({ patientId }: { patientId: number }) {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()

  // Set the moment I leave the care team: switches the profile query OFF,
  // so the page can't refetch it (and get a 403) on its way out — see
  // useLeaveCareTeam for the order of events.
  const [hasLeft, setHasLeft] = useState(false)
  const patientQuery = useUser(patientId, { enabled: !hasLeft })
  const { data: patient, isLoading, error } = patientQuery
  // After a "Try again" that worked, focus goes to the patient's name.
  const heading = useRetryFocus<HTMLHeadingElement>('this patient', patientQuery.isSuccess)

  if (hasLeft) return null

  if (isLoading) {
    return <Loading label="Loading the patient…" className="mx-auto mt-8 max-w-2xl px-4" />
  }

  if (error) {
    return error instanceof ApiError && error.statusCode === 403 ? (
      <NotOnCareTeam />
    ) : (
      <RecordLoadFailed queries={[patientQuery]} what="this patient" noun="patient" links={WAYS_OUT} />
    )
  }

  if (!patient || !currentUser) return null

  const fullName = `${patient.firstName} ${patient.lastName}`
  // The clinics I work at (from /auth/me), for the badges.
  const myClinicIds = currentUser.clinics.map((clinic) => clinic.id)

  function handleLeft() {
    setHasLeft(true)
    // The confirmation is a snackbar (decisions §33), drawn by the layout
    // over the roster. (Until 2026-10-31 it was navigation state, read by
    // the roster — which the browser keeps across a reload, so the notice
    // came back on a refresh.) `replace`: this page REPLACES itself in the
    // history, so Back from the roster doesn't return to a page I can no
    // longer open.
    showSuccess(`You left ${fullName}'s care team.`)
    void navigate('/practitioner/patients', { replace: true })
  }

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-8 px-4 pb-8">
      <div className="space-y-3">
        <Link to="/practitioner/patients" className="text-sm text-muted-foreground hover:underline">
          ← My patients
        </Link>
        <div className="flex items-center gap-4">
          {/* The photo, read-only: a practitioner may not change a
              patient's photo (decisions §4) — UserAvatar, not AvatarUpload. */}
          <UserAvatar
            firstName={patient.firstName}
            lastName={patient.lastName}
            avatarUrl={patient.avatarUrl}
            className="size-16 text-lg"
          />
          <div className="min-w-0 space-y-1">
            <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
              {fullName}
            </h1>
            {patient.patientProfile && (
              <p className="text-sm text-muted-foreground">
                Born {formatCalendarDate(patient.patientProfile.dateOfBirth)}
              </p>
            )}
            {/* Every clinic, as on the roster: I'm on the care team — the
                ones I don't work at marked the same way, with the same key. */}
            <ClinicBadges clinics={patient.clinics} myClinicIds={myClinicIds} />
            {showsOtherClinic([patient], myClinicIds) && <OtherClinicsKey />}
            {/* The page opens only for the care team (a 403 otherwise) —
                exactly who may write to this patient. Not to a deactivated
                one (decisions §22: the backend answers 409) — the notice
                below says why. An existing conversation stays readable
                from Messages. */}
            {patient.isActive && (
              <div className="pt-1">
                <MessageButton role="practitioner" person={patient} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* A deactivated patient (decided 2026-10-25): their care team keeps
          its links — deactivating blocks a sign-in, it isn't a discharge —
          so the page still opens. Since 2026-10-27 (decisions §22) writing
          TO the patient is refused (programs, messages) while writing to
          the record isn't: the notice says both, at the top. Ending care is
          the practitioner's own act (Leave care team, below). */}
      {!patient.isActive && (
        <p className="rounded-md border border-amber-600/40 bg-amber-500/10 p-3 text-sm">
          <span className="font-medium">Account deactivated.</span>{' '}
          {deactivatedPatientNotice(patient.firstName)}
        </p>
      )}

      <PatientProgramsSection patientId={patientId} patientActive={patient.isActive} />

      <MedicalFileLinkCard patientId={patientId} />

      {/* Beside the medical file, data-free like it (decisions §36). */}
      <RangeOfMotionLinkCard patientId={patientId} />

      <CareTeamSection
        patientId={patientId}
        patientFirstName={patient.firstName}
        patientLastName={patient.lastName}
        myId={currentUser.id}
        // A practitioner: may add a colleague, may only leave themselves.
        canAdd
        canEndAny={false}
        patientActive={patient.isActive}
        onLeft={handleLeft}
      />

      {/* The same component as the admin user page (props, not the
          route — built for this reuse). The backend lets the care team
          send, resend and revoke a patient's invitation. Renders nothing
          for an account with no invitation history. */}
      <InvitationStatus
        userId={patientId}
        userName={fullName}
        email={patient.email}
        isActive={patient.isActive}
      />

      {/* The same editable profile as /profile and the admin user page:
          the care team may edit a patient's details (decisions §4); the
          email stays read-only everywhere; no license (not a practitioner,
          and only admins may change one anyway). */}
      <ProfileFields user={patient} canEditLicense={false} />
    </div>
  )
}

// What a practitioner who isn't on the care team sees (an old link, a typed
// address, or a page opened just before a colleague ended their link). The
// backend's 403 says nothing about the patient — and neither does this: no
// name, nothing to identify them. It explains the rule and where to go.
function NotOnCareTeam() {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-3 px-4">
      <h1 className="text-xl font-semibold">You're not on this patient's care team</h1>
      <p className="text-sm text-muted-foreground">
        Only a patient's care team can open their record. If you're treating this patient, find them
        in your clinic's patients and add them to yours.
      </p>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link to="/practitioner/patients/add" className="font-medium underline">
          Find a patient
        </Link>
        <Link to="/practitioner/patients" className="font-medium underline">
          My patients
        </Link>
      </div>
    </div>
  )
}