import type { ReactNode, Ref } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { LoadError } from '@/common/LoadError'
import { UserAvatar } from '@/common/UserAvatar'
import { useRetryFocus } from '@/common/useRetryFocus'
import { MessageButton } from '@/messages/MessageButton'
import { useAssignedPrograms } from '@/assigned-programs/useAssignedPrograms'
import type { AssignedProgramListItem } from '@/assigned-programs/types'
import { programRowSummary } from '@/patients/patientPageRules'
import { programPagePath } from '@/sessions/programPagePath'
import { ClinicContact } from './ClinicContact'
import { viewedPractitionerState } from './teamReturn'
import { findTeamMember, programsFrom } from './teamRules'
import type { MyCareTeamEntry } from './types'
import { useMyCareTeam } from './useMyCareTeam'
import { ListSkeleton, Loading } from '@/common/Loading'

// One member of the patient's care team — `/patient/team/:practitionerId`
// (Phase 4, "My Team", agreed 2026-10-18): who they are (photo, name,
// specialties, bio), where the patient sees them (each shared clinic, with
// its contact details) and the programs they assigned.
//
// It reads the Team page's own query: opened from the list, it's already
// cached. A CURRENT member only — past members, and anyone never on the
// team, get "isn't on your care team" (the backend would still answer the
// list; this page simply has nothing to show for them).
export function PractitionerProfilePage() {
  const { practitionerId: param } = useParams<{ practitionerId: string }>()
  // No separate check of the id: one that isn't a number ("abc" → NaN)
  // simply matches no member below, and gets the same answer as any other
  // id that isn't on the team.
  const practitionerId = Number(param)
  const team = useMyCareTeam()
  // After a "Try again" that worked, focus goes to the heading of what came
  // back: the practitioner's name, or "Not on your care team".
  const heading = useRetryFocus<HTMLHeadingElement>('your care team', team.isSuccess)

  if (team.isError) {
    return (
      <ProfilePage>
        <LoadError what="your care team" queries={[team]} />
      </ProfilePage>
    )
  }
  if (!team.isSuccess) {
    return (
      <ProfilePage>
        <Loading />
      </ProfilePage>
    )
  }
  const member = findTeamMember(team.data, practitionerId)
  if (!member) return <NotOnTeam heading={heading} />
  return <Profile entry={member} heading={heading} />
}

// Every state of the page — loading, error, not on the team, the profile —
// shares this frame, so the way back is always in the same place.
//
// "Back to My team" sits at the TOP (the Sessions program page has its
// link at the bottom): a profile with a bio, its clinics and programs runs
// to several screens on a phone, and the way back should be visible on
// arrival, where a detail page's "back" is expected.
//
// A plain link to the list's address, not "go back one step in the
// history" (navigate(-1)): the profile's parent is always the list, and a
// link also works when the profile was opened directly (a refresh, a
// bookmark) — where the history's previous step could be another site.
// `viewedId` (known once the member is found) rides along in navigation
// state, so the list can put focus back on that card (teamReturn.ts).
function ProfilePage({ children, viewedId }: { children: ReactNode; viewedId?: number }) {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-8 px-4 pb-8">
      <Link
        to="/patient/team"
        state={viewedId === undefined ? undefined : viewedPractitionerState(viewedId)}
        className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back to My team
      </Link>
      {children}
    </div>
  )
}

function NotOnTeam({ heading }: { heading: Ref<HTMLHeadingElement> }) {
  return (
    <ProfilePage>
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        Not on your care team
      </h1>
      <p className="text-sm text-muted-foreground">This practitioner isn't on your care team.</p>
    </ProfilePage>
  )
}

function Profile({ entry, heading }: { entry: MyCareTeamEntry; heading: Ref<HTMLHeadingElement> }) {
  const { practitioner } = entry
  return (
    <ProfilePage viewedId={practitioner.id}>
      {/* Stacked and centred on a phone; side by side from `sm` up. */}
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <UserAvatar
          firstName={practitioner.firstName}
          lastName={practitioner.lastName}
          avatarUrl={practitioner.avatarUrl}
          className="size-24 text-2xl"
        />
        <div className="min-w-0 space-y-3">
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
            {practitioner.firstName} {practitioner.lastName}
          </h1>
          {practitioner.specialties.length > 0 && (
            <ul aria-label="Specialties" className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {practitioner.specialties.map((specialty) => (
                <li key={specialty} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {specialty}
                </li>
              ))}
            </ul>
          )}
          {/* Only a CURRENT member reaches this page (NotOnTeam above), the
              same rule the backend applies to starting a conversation. */}
          <div className="flex justify-center sm:justify-start">
            <MessageButton role="patient" person={practitioner} />
          </div>
        </div>
      </div>

      {/* No bio → nothing at all: a "No bio yet" line would only point at
          something missing that the patient can't change. pre-line keeps
          the paragraphs the practitioner typed (a bio is free text). */}
      {practitioner.bio && <p className="whitespace-pre-line">{practitioner.bio}</p>}

      <section aria-labelledby="profile-clinics" className="space-y-3">
        <h2 id="profile-clinics" className="text-lg font-semibold">
          Where they see you
        </h2>
        {/* A current member always shares a clinic (it's half of the
            access rule), so this list is never empty. */}
        <ul className="space-y-3">
          {entry.sharedClinics.map((clinic) => (
            <ClinicContact key={clinic.id} clinic={clinic} />
          ))}
        </ul>
      </section>

      <ProgramsFrom practitionerId={practitioner.id} firstName={practitioner.firstName} />
    </ProfilePage>
  )
}

// The patient's programs this practitioner assigned — the Sessions hub's
// list (GET /assigned-programs, usually cached), filtered. Current first,
// then past, each leading to the program's own page.
function ProgramsFrom({ practitionerId, firstName }: { practitionerId: number; firstName: string }) {
  const list = useAssignedPrograms()
  // The section's heading is always shown: focus goes there once a retry
  // brought the list back.
  const heading = useRetryFocus<HTMLHeadingElement>('your programs', list.isSuccess)
  return (
    <section aria-labelledby="profile-programs" className="space-y-3">
      <h2 ref={heading} tabIndex={-1} id="profile-programs" className="text-lg font-semibold outline-none">
        Programs from them
      </h2>
      {list.isPending && <ListSkeleton label="Loading your programs…" rows={2} layout="cards" />}
      {list.isError && <LoadError what="your programs" queries={[list]} />}
      {list.data && <ProgramList programs={list.data} practitionerId={practitionerId} firstName={firstName} />}
    </section>
  )
}

function ProgramList({
  programs,
  practitionerId,
  firstName,
}: {
  programs: AssignedProgramListItem[]
  practitionerId: number
  firstName: string
}) {
  const { current, past } = programsFrom(programs, practitionerId)
  const all = [...current, ...past]
  if (all.length === 0) {
    return <p className="text-sm text-muted-foreground">No programs from {firstName} yet.</p>
  }
  return (
    <ul className="divide-y rounded-lg border">
      {all.map((program) => (
        <li key={program.id} className="space-y-0.5 px-4 py-3">
          <Link to={programPagePath(program.id)} className="font-medium underline underline-offset-4">
            {program.title}
          </Link>
          {/* The hub's row words: "Started June 2, 2031 · Active",
              "Completed · ended May 20, 2031 · ran from …". */}
          <p className="text-sm text-muted-foreground">{programRowSummary(program)}</p>
        </li>
      ))}
    </ul>
  )
}