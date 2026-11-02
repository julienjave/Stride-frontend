import { UserAvatar } from '@/common/UserAvatar'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { ClinicBadges } from './ClinicBadges'
import type { ClinicRef } from './types'

interface PatientIdentityProps {
  // The user's id, for their avatar's tint (UserAvatar).
  userId: number
  firstName: string
  lastName: string
  avatarUrl: string | null
  dateOfBirth: string | null
  clinics: readonly ClinicRef[]
  // The signed-in practitioner's clinic ids, so badges for the others are
  // marked (ClinicBadges). Given by My patients; not by the directory
  // search, whose clinics are all shared ones.
  myClinicIds?: readonly number[]
}

// "Who is this?" — photo, name, date of birth and clinics: the block every
// patient row starts with, in "My patients" AND in the directory search.
// One component so the two lists identify a patient identically, and a
// practitioner who just added someone recognises the same row on the
// roster.
//
// It renders only the identity, never the row's action (a link, a button),
// which differs between the two lists: the parent puts it next to this.
export function PatientIdentity({
  userId,
  firstName,
  lastName,
  avatarUrl,
  dateOfBirth,
  clinics,
  myClinicIds,
}: PatientIdentityProps) {
  return (
    // min-w-0 lets this flex child shrink below its content's width, so a
    // long name wraps (or truncates) instead of pushing the row's action
    // button off the side of a phone screen.
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar
        userId={userId}
        firstName={firstName}
        lastName={lastName}
        avatarUrl={avatarUrl}
        className="size-10 text-sm"
      />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">
          {firstName} {lastName}
        </p>
        {/* The date of birth is how two people with the same name are told
            apart — the reason the directory returns it at all. */}
        {dateOfBirth && (
          <p className="text-sm text-muted-foreground">
            Born {formatCalendarDate(dateOfBirth)}
          </p>
        )}
        <ClinicBadges clinics={clinics} myClinicIds={myClinicIds} />
      </div>
    </div>
  )
}