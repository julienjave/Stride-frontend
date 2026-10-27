import { useState, type ReactNode } from 'react'
import { UserAvatar } from '@/common/UserAvatar'
import { formatMomentDate } from '@/common/formatMomentDate'
import { cn } from '@/lib/utils'
import { AddCareTeamMemberDialog } from './AddCareTeamMemberDialog'
import { EndCareTeamMembershipButton } from './EndCareTeamMembershipButton'
import { LeaveCareTeamButton } from './LeaveCareTeamButton'
import { PatientPageSection } from './PatientPageSection'
import { isOnlyActiveMember, sortCareTeam } from './patientPageRules'
import type { CareTeamEntry } from './types'
import { useCareTeam } from './useCareTeam'

interface CareTeamSectionProps {
  patientId: number
  patientFirstName: string
  patientLastName: string
  // The viewer — to mark "(you)" and find their own row.
  myId: number
  // What the viewer may do — PROPS, not a check of the role inside: the
  // page that renders the section knows who is looking, and the section
  // stays one component for every viewer (decided 2026-10-09). Each
  // mirrors a backend rule; the backend enforces it regardless.
  //   canAdd    — add a practitioner (practitioner: "Add a colleague";
  //               admin: "Add someone").
  //   canEndAny — end ANY current link (admins). Without it, only my own
  //               row gets an action: "Leave care team".
  canAdd: boolean
  canEndAny: boolean
  // Whether the patient's ACCOUNT is active. A deactivated patient keeps
  // their care team (decisions §18): it's still shown, and links can still
  // end — but nobody new joins until the account is reactivated (decisions
  // §21: the backend answers 409). Required, so every page says which it is.
  patientActive: boolean
  // "Leave care team" needs it (the page navigates away afterwards); a
  // viewer who can't leave — an admin — doesn't pass it.
  onLeft?: () => void
}

// Who treats this patient: each practitioner, since when, why, and who
// added them. "Show past members" adds the history (links are ended, never
// deleted — decisions §3). Used on the practitioner's patient page and the
// admin's user page, with different permissions (see the props).
export function CareTeamSection({
  patientId,
  patientFirstName,
  patientLastName,
  myId,
  canAdd,
  canEndAny,
  patientActive,
  onLeft,
}: CareTeamSectionProps) {
  const [showPast, setShowPast] = useState(false)
  // Two cache entries (with / without history); toggling back is instant.
  const { data: entries, isLoading, isError } = useCareTeam(patientId, showPast)

  const actions = (
    <div className="flex flex-wrap items-center gap-3">
      {/* A plain native checkbox — the same choice as "Show deactivated users". */}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
        Show past members
      </label>
      {canAdd && patientActive && (
        <AddCareTeamMemberDialog
          patientId={patientId}
          patientFirstName={patientFirstName}
          // An admin isn't adding a colleague of their OWN.
          label={canEndAny ? 'Add someone' : 'Add a colleague'}
        />
      )}
    </div>
  )

  // The action on one row: an admin may end any current link; anyone else
  // only leaves their own. Past links have no action.
  function rowAction(entry: CareTeamEntry, all: CareTeamEntry[]): ReactNode {
    if (!entry.isActive) return null
    if (canEndAny) {
      return (
        <EndCareTeamMembershipButton
          patientId={patientId}
          patientFirstName={patientFirstName}
          patientLastName={patientLastName}
          practitioner={entry.practitioner}
          isOnlyMember={isOnlyActiveMember(all, entry.practitioner.id)}
        />
      )
    }
    if (entry.practitioner.id === myId && onLeft) {
      return (
        <LeaveCareTeamButton
          patientId={patientId}
          patientFirstName={patientFirstName}
          patientLastName={patientLastName}
          myId={myId}
          isOnlyMember={isOnlyActiveMember(all, myId)}
          onLeft={onLeft}
        />
      )
    }
    return null
  }

  return (
    <PatientPageSection title="Care team" action={actions}>
      {/* Instead of the button, why there is none — for whoever would have
          had it. The admin can do something about it (reactivate, on the
          same page); a practitioner is told who can. */}
      {canAdd && !patientActive && (
        <p className="text-sm text-muted-foreground">
          Nobody new can join {patientFirstName}'s care team while their account is deactivated.{' '}
          {canEndAny ? 'Reactivate the account to add someone.' : 'An admin can reactivate it.'}
        </p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Loading the care team…</p>}
      {isError && (
        <p className="text-sm text-destructive">Couldn't load the care team. Try refreshing.</p>
      )}
      {entries && entries.length === 0 && (
        // Possible for an admin: a patient whose last practitioner was
        // removed. (A practitioner on the page is on the team themselves.)
        <p className="text-sm text-muted-foreground">
          No practitioner is on {patientFirstName}'s care team.
        </p>
      )}
      {entries && entries.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border">
          {sortCareTeam(entries).map((entry) => (
            <CareTeamRow
              key={entry.id}
              entry={entry}
              isMe={entry.practitioner.id === myId}
              action={rowAction(entry, entries)}
            />
          ))}
        </ul>
      )}
    </PatientPageSection>
  )
}

function CareTeamRow({
  entry,
  isMe,
  action,
}: {
  entry: CareTeamEntry
  isMe: boolean
  action: ReactNode
}) {
  const { practitioner, createdBy } = entry
  // "Added by …" only when someone ELSE added them. A self-join needs no
  // note, and a link with no creator is one of the day-one links created
  // when the care team was introduced (createdBy NULL, decisions §3).
  const addedBySomeoneElse = createdBy !== null && createdBy.id !== practitioner.id

  return (
    <li className={cn('flex items-start justify-between gap-3 px-4 py-3', !entry.isActive && 'opacity-70')}>
      <div className="flex min-w-0 items-start gap-3">
        <UserAvatar
          firstName={practitioner.firstName}
          lastName={practitioner.lastName}
          avatarUrl={practitioner.avatarUrl}
          className="size-8 text-xs"
        />
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">
            {practitioner.firstName} {practitioner.lastName}
            {isMe && <span className="text-muted-foreground"> (you)</span>}
          </p>
          <p className="text-sm text-muted-foreground">{periodText(entry)}</p>
          {entry.reason && <p className="text-sm">“{entry.reason}”</p>}
          {addedBySomeoneElse && (
            <p className="text-xs text-muted-foreground">
              Added by {createdBy.firstName} {createdBy.lastName}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </li>
  )
}

// The link's period in words. Three cases, from `isActive` + `endsAt`
// (decisions §3: endsAt NULL = open-ended, future = planned cover, past =
// ended):
//   current, open-ended   → "Since October 8, 2026"
//   current, planned end  → "Since …, until …"
//   ended                 → "From … to …"
// `isActive` comes from the backend, computed with the SAME rule as access
// (period AND a shared clinic) — so a link left without a shared clinic
// shows as ended even if its endsAt is empty.
function periodText(entry: CareTeamEntry): string {
  const since = formatMomentDate(entry.startedAt)
  if (entry.isActive) {
    return entry.endsAt ? `Since ${since}, until ${formatMomentDate(entry.endsAt)}` : `Since ${since}`
  }
  return entry.endsAt ? `From ${since} to ${formatMomentDate(entry.endsAt)}` : `From ${since} (ended)`
}