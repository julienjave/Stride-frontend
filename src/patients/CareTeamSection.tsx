import { useState, type ReactNode } from 'react'
import { UserAvatar } from '@/common/UserAvatar'
import { formatMomentDate } from '@/common/formatMomentDate'
import { cn } from '@/lib/utils'
import { LeaveCareTeamButton } from './LeaveCareTeamButton'
import { PatientPageSection } from './PatientPageSection'
import { isOnlyActiveMember, sortCareTeam } from './patientPageRules'
import type { CareTeamEntry } from './types'
import { useCareTeam } from './useCareTeam'

interface CareTeamSectionProps {
  patientId: number
  patientFirstName: string
  patientLastName: string
  myId: number
  onLeft: () => void
}

// Who treats this patient: each practitioner, since when, why, and who
// added them. "Show past members" adds the history (links are ended, never
// deleted — decisions §3). My own current row offers "Leave care team";
// nobody else's does — the backend lets a practitioner end only their own
// link. ("Add a colleague" is its own roadmap item, next.)
export function CareTeamSection({
  patientId,
  patientFirstName,
  patientLastName,
  myId,
  onLeft,
}: CareTeamSectionProps) {
  const [showPast, setShowPast] = useState(false)
  // Two cache entries (with / without history); toggling back is instant.
  const { data: entries, isLoading, isError } = useCareTeam(patientId, showPast)

  const showPastToggle = (
    // A plain native checkbox — the same choice as "Show deactivated users".
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
      Show past members
    </label>
  )

  return (
    <PatientPageSection title="Care team" action={showPastToggle}>
      {isLoading && <p className="text-sm text-muted-foreground">Loading the care team…</p>}
      {isError && (
        <p className="text-sm text-destructive">Couldn't load the care team. Try refreshing.</p>
      )}
      {entries && (
        <ul className="divide-y divide-border rounded-lg border">
          {sortCareTeam(entries).map((entry) => (
            <CareTeamRow
              key={entry.id}
              entry={entry}
              isMe={entry.practitioner.id === myId}
              leaveButton={
                entry.isActive && entry.practitioner.id === myId ? (
                  <LeaveCareTeamButton
                    patientId={patientId}
                    patientFirstName={patientFirstName}
                    patientLastName={patientLastName}
                    myId={myId}
                    isOnlyMember={isOnlyActiveMember(entries, myId)}
                    onLeft={onLeft}
                  />
                ) : null
              }
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
  leaveButton,
}: {
  entry: CareTeamEntry
  isMe: boolean
  leaveButton: ReactNode
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
      {leaveButton && <div className="shrink-0">{leaveButton}</div>}
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