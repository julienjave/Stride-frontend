import type { User } from '@/users/types'
import type { PatientMerge } from './types'

// The merge's rules as the SCREEN needs them (decisions §27, pass 4). The
// backend decides (patient-merge-rules.ts, and the database again); these
// only keep the screen from offering what it would refuse, and say why.

// The merge that took this account away, if any.
export function mergeOf(merges: PatientMerge[], userId: number): PatientMerge | undefined {
  return merges.find((merge) => merge.mergedId === userId)
}

// The accounts this one could be merged with: other PATIENT accounts not
// merged away themselves, in the users list's order (last name, first
// name, then id — two people can share a name).
export function mergeCandidates(users: User[], merges: PatientMerge[], selfId: number): User[] {
  const mergedAway = new Set(merges.map((merge) => merge.mergedId))
  return users
    .filter(
      (user) => user.id !== selfId && user.roles.includes('patient') && !mergedAway.has(user.id),
    )
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName) ||
        a.firstName.localeCompare(b.firstName) ||
        a.id - b.id,
    )
}

export const STAFF_CANNOT_GO_MESSAGE =
  "This account is also a practitioner or admin account, so it can't be merged away — keep it."
export const DEACTIVATED_CANNOT_STAY_MESSAGE =
  "This account is deactivated, so it can't be the one kept. Reactivate it first."

// Why `keep` can't be the account kept while `other` is merged away into it,
// or null when that is allowed. The backend's last two rules, from the
// screen's side: the account merged away holds the patient role only; the
// account kept is active. (Both being patients, and neither merged already,
// is what mergeCandidates offers in the first place.)
export function keepRefusal(keep: User, other: User): string | null {
  if (other.roles.some((role) => role !== 'patient')) return STAFF_CANNOT_GO_MESSAGE
  if (!keep.isActive) return DEACTIVATED_CANNOT_STAY_MESSAGE
  return null
}

// How a candidate reads in the picker: enough to tell two namesakes apart.
export function candidateLabel(user: User): string {
  const parts = [`${user.firstName} ${user.lastName}`, user.email]
  if (user.patientProfile) parts.push(`born ${user.patientProfile.dateOfBirth}`)
  if (!user.isActive) parts.push('deactivated')
  return parts.join(' · ')
}
