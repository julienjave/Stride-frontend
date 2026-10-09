import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { UserAvatar } from '@/common/UserAvatar'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { InvitationStatus } from '@/invitations/InvitationStatus'
import { ProfileFields } from '@/users/ProfileFields'
import { useUser } from '@/users/useUser'
import { CareTeamSection } from './CareTeamSection'
import { ClinicBadges } from './ClinicBadges'
import { PatientProgramsSection } from './PatientProgramsSection'

// The practitioner's patient page (/practitioner/patients/:id) — decided
// 2026-10-08 (decisions §3, "Patient page"). Top to bottom, in the order a
// practitioner needs it: who this is, their programs, their care team,
// their invitation (until they've set up their account), and their profile.
//
// Only the patient's CARE TEAM sees it: GET /users/:id answers anyone else
// with a 403, and the page explains that instead of a generic error.
export function PatientPage() {
  const { id } = useParams<{ id: string }>()
  const patientId = Number(id)

  if (!id || !Number.isInteger(patientId) || patientId < 1) {
    return <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-destructive">Invalid patient.</p>
  }

  // key={patientId}: going from one patient's page to another's (same
  // route, new :id) mounts a FRESH view, so no state — the "left" flag,
  // an open dialog, the past-members toggle — carries over to the next
  // patient. The same idea as InvitationSentNotice's key.
  return <PatientView key={patientId} patientId={patientId} />
}

function PatientView({ patientId }: { patientId: number }) {
  const navigate = useNavigate()
  const { data: currentUser } = useCurrentUser()

  // Set the moment I leave the care team: switches the profile query OFF,
  // so the page can't refetch it (and get a 403) on its way out — see
  // useLeaveCareTeam for the order of events.
  const [hasLeft, setHasLeft] = useState(false)
  const { data: patient, isLoading, error } = useUser(patientId, { enabled: !hasLeft })

  if (hasLeft) return null

  if (isLoading) {
    return (
      <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-muted-foreground">Loading patient…</p>
    )
  }

  if (error) {
    return error instanceof ApiError && error.statusCode === 403 ? (
      <NotOnCareTeam />
    ) : (
      <p className="mx-auto mt-8 max-w-2xl px-4 text-sm text-destructive">
        Couldn't load this patient. Try refreshing.
      </p>
    )
  }

  if (!patient || !currentUser) return null

  const fullName = `${patient.firstName} ${patient.lastName}`

  function handleLeft() {
    setHasLeft(true)
    // The roster reads this state and confirms what happened (it's
    // navigation state, not part of the URL: a reload doesn't repeat it).
    // `replace`: this page REPLACES itself in the history, so Back from
    // the roster doesn't return to a page I can no longer open.
    void navigate('/practitioner/patients', {
      replace: true,
      state: { notice: `You left ${fullName}'s care team.` },
    })
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
            <h1 className="text-xl font-semibold">{fullName}</h1>
            {patient.patientProfile && (
              <p className="text-sm text-muted-foreground">
                Born {formatCalendarDate(patient.patientProfile.dateOfBirth)}
              </p>
            )}
            {/* Every clinic, as on the roster: I'm on the care team. */}
            <ClinicBadges clinics={patient.clinics} />
          </div>
        </div>
      </div>

      <PatientProgramsSection patientId={patientId} />

      <CareTeamSection
        patientId={patientId}
        patientFirstName={patient.firstName}
        patientLastName={patient.lastName}
        myId={currentUser.id}
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