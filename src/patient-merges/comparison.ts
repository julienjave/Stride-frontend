import { formatAddressLines } from '@/common/address/format'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatMomentDate } from '@/common/formatMomentDate'
import type { InvitationSummary } from '@/invitations/types'
import type { CareTeamEntry } from '@/patients/types'
import type { User } from '@/users/types'

// The merge comparison's rows (decisions §27, pass 4) — pure: an account,
// its care team and invitations in; the rows and their differences out.
// Drawn by MergeComparison.tsx.

// A value not known yet — still loading, or its request failed.
export const UNKNOWN = '—'

// One row of a card: a label and the value as read (never empty — "None").
export interface ComparedRow {
  label: string
  value: string
}

// The invitation's state, in words: the newest invitation is the current
// one (the list comes newest first).
export function invitationText(invitations: InvitationSummary[]): string {
  const latest = invitations[0]
  if (!latest) return 'None'
  switch (latest.status) {
    case 'accepted':
      return 'Accepted — the account has a password'
    case 'pending':
      return 'Sent, not accepted yet'
    case 'expired':
      return 'Expired, not accepted'
    case 'revoked':
      return 'Revoked'
  }
}

// The rows of one account. Pure — the care team and invitations are passed
// in once loaded (null while loading or failed: UNKNOWN — the failure itself is
// said once, under the cards, by the app's LoadError with its "Try again").
export function comparedRows(
  user: User,
  careTeam: CareTeamEntry[] | null,
  invitations: InvitationSummary[] | null,
  locale?: string,
): ComparedRow[] {
  const address = formatAddressLines(user)
  return [
    { label: 'Email', value: user.email },
    {
      label: 'Date of birth',
      value: user.patientProfile
        ? formatCalendarDate(user.patientProfile.dateOfBirth, locale)
        : 'None',
    },
    { label: 'Phone', value: user.phone ?? 'None' },
    { label: 'Address', value: address.length > 0 ? address.join(', ') : 'None' },
    {
      label: 'Clinics',
      value:
        user.clinics.length > 0 ? user.clinics.map((clinic) => clinic.name).join(', ') : 'None',
    },
    {
      label: 'Care team',
      value:
        careTeam === null
          ? UNKNOWN
          : careTeam.length > 0
            ? careTeam
                .map((entry) => `${entry.practitioner.firstName} ${entry.practitioner.lastName}`)
                .join(', ')
            : 'None',
    },
    { label: 'Status', value: user.isActive ? 'Active' : 'Deactivated' },
    { label: 'Created', value: formatMomentDate(user.createdAt, locale) },
    {
      label: 'Invitation',
      value: invitations === null ? UNKNOWN : invitationText(invitations),
    },
  ]
}

// The labels of the rows whose values differ (Email and Created always do —
// two accounts — so they're left out: saying it would teach nothing).
export function differingLabels(left: ComparedRow[], right: ComparedRow[]): string[] {
  return left
    .filter(
      (row, index) =>
        row.label !== 'Email' &&
        row.label !== 'Created' &&
        // A value not known on either side can't be compared yet.
        row.value !== UNKNOWN &&
        right[index].value !== UNKNOWN &&
        row.value !== right[index].value,
    )
    .map((row) => row.label)
}