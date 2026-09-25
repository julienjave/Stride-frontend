import type { UserRole } from './schemas'

// The human-readable name for each role, shown in the account menu
// ("Julien · Practitioner") and the role switcher. Raw enum values like
// 'practitioner' are for code; people read "Practitioner".
//
// Same Record<UserRole, …> technique as roleHomePath.ts: if UserRole ever
// gains a fourth value, this stops compiling until it gets a label.
const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  practitioner: 'Practitioner',
  patient: 'Patient',
}

export function roleLabel(role: UserRole): string {
  return ROLE_LABELS[role]
}