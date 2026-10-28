import { type Ref, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { LoadError } from '@/common/LoadError'
import { ShowHiddenToggle } from '@/common/ShowHiddenToggle'
import { UserAvatar } from '@/common/UserAvatar'
import { useRetryFocus } from '@/common/useRetryFocus'
import { practitionerProfilePath } from './practitionerProfilePath'
import { readViewedPractitioner } from './teamReturn'
import { splitTeam } from './teamRules'
import { addedByText, endedByText, memberPeriodText, specialtiesText } from './teamText'
import type { MyCareTeamEntry } from './types'
import { useMyCareTeam } from './useMyCareTeam'
import { ListSkeleton } from '@/common/Loading'

// The patient's Team tab — `/patient/team` (Phase 4, "My Team", agreed
// 2026-10-18). Who looks after me: one card per CURRENT care-team member —
// photo, name, specialties, the clinic(s) where we meet, since when, and who
// added them — each opening their profile. Then the people who used to be on
// the team, behind "Show N past members" (off on every visit, the Sessions
// hub's rule: history, not what the patient came for).
//
// The data is the care team's own list (GET /users/:id/care-team) — the one
// access rule, written once in the backend. Directory fields only: no
// contact details of the practitioner's own, no license, no staff reason.
export function MyTeamPage() {
  const team = useMyCareTeam()
  const [showPast, setShowPast] = useState(false)

  // Back from a profile ("Back to My team"): focus returns to that
  // practitioner's card link, where the patient left off. An effect, because
  // the link must be ON the page first — React runs effects after putting
  // the render on screen. Looked up inside the list (a ref), by a data
  // attribute rather than by name: two practitioners can share a name.
  //
  // When it runs: from a profile the data is cached, so the cards are there
  // on the first render. After a RELOAD (the navigation state survives it,
  // the cache doesn't) the first render is "Loading…" — no list, so the
  // lookup finds nothing — and `loaded` in the dependencies runs it again
  // once the cards are in. Not re-run on a refetch (neither value changes),
  // so focus isn't moved again while the patient is using the page.
  const viewedId = readViewedPractitioner(useLocation().state)
  const listRef = useRef<HTMLUListElement>(null)
  const loaded = team.isSuccess
  useEffect(() => {
    // (`viewedId === null` only says "nothing to do" plainly: without it the
    // lookup would search for "null" and find nothing — the same outcome.)
    if (viewedId === null) return
    listRef.current?.querySelector<HTMLElement>(`[data-practitioner-link="${viewedId}"]`)?.focus()
  }, [viewedId, loaded])

  // After a "Try again" that worked, focus goes to the page's heading — on
  // screen in every state (the frame's), so `loaded` says when it fires.
  const heading = useRetryFocus<HTMLHeadingElement>('your care team', loaded)

  if (team.isError) {
    return (
      <TeamPage heading={heading}>
        <LoadError what="your care team" queries={[team]} />
      </TeamPage>
    )
  }
  if (!team.isSuccess) {
    return (
      <TeamPage heading={heading}>
        <ListSkeleton label="Loading your care team…" rows={2} avatar layout="cards" />
      </TeamPage>
    )
  }

  const { current, past } = splitTeam(team.data)
  return (
    <TeamPage heading={heading}>
      {current.length === 0 ? (
        // Possible: a practitioner left the clinic, or ended their link, and
        // nobody has joined since. Who will look after them is the clinic's
        // call — say so, rather than an empty page.
        <p className="text-sm text-muted-foreground">
          No practitioner is on your care team right now. Your clinic can tell you who will be looking
          after you.
        </p>
      ) : (
        <ul ref={listRef} aria-label="Your care team" className="space-y-3">
          {current.map((entry) => (
            <MemberCard key={entry.id} entry={entry} />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <ShowHiddenToggle
            count={past.length}
            singular="past member"
            plural="past members"
            checked={showPast}
            onChange={setShowPast}
          />
          {showPast && (
            <ul aria-label="Past members" className="divide-y rounded-lg border">
              {past.map((entry) => (
                <PastMemberRow key={entry.id} entry={entry} />
              ))}
            </ul>
          )}
        </section>
      )}
    </TeamPage>
  )
}

function TeamPage({ children, heading }: { children: ReactNode; heading: Ref<HTMLHeadingElement> }) {
  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4 pb-8">
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        My team
      </h1>
      {children}
    </div>
  )
}

// One current member. The whole card opens the profile, but only the NAME
// is the link: its ::after box is stretched over the card (`relative` on the
// card, `after:absolute after:inset-0` on the link), so a tap anywhere lands
// on it, while a screen reader hears one short link ("Alex Chen") instead of
// the card's every line read as its name. The focus ring is drawn on that
// box, so a keyboard user sees the whole card outlined.
function MemberCard({ entry }: { entry: MyCareTeamEntry }) {
  const { practitioner } = entry
  const name = `${practitioner.firstName} ${practitioner.lastName}`
  const specialties = specialtiesText(practitioner.specialties)
  const addedBy = addedByText(entry)
  return (
    <li className="relative flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <UserAvatar
        firstName={practitioner.firstName}
        lastName={practitioner.lastName}
        avatarUrl={practitioner.avatarUrl}
        className="size-12 text-base"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="font-semibold">
          <Link
            to={practitionerProfilePath(practitioner.id)}
            data-practitioner-link={practitioner.id}
            className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
          >
            {name}
          </Link>
        </h2>
        {specialties && <p className="text-sm">{specialties}</p>}
        {entry.sharedClinics.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {entry.sharedClinics.map((clinic) => clinic.name).join(', ')}
          </p>
        )}
        <p className="text-sm text-muted-foreground">{memberPeriodText(entry)}</p>
        {addedBy && <p className="text-xs text-muted-foreground">{addedBy}</p>}
      </div>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 self-center text-muted-foreground" />
    </li>
  )
}

// A past member: who, and when — no link (their profile is for current
// members only) and no clinics (they may share none any more).
function PastMemberRow({ entry }: { entry: MyCareTeamEntry }) {
  const { practitioner } = entry
  const endedBy = endedByText(entry)
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <UserAvatar
        firstName={practitioner.firstName}
        lastName={practitioner.lastName}
        avatarUrl={practitioner.avatarUrl}
        className="size-8 text-xs"
      />
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium">
          {practitioner.firstName} {practitioner.lastName}
        </p>
        <p className="text-sm text-muted-foreground">{memberPeriodText(entry)}</p>
        {endedBy && <p className="text-xs text-muted-foreground">{endedBy}</p>}
      </div>
    </li>
  )
}