import { formatMomentDate } from '@/common/formatMomentDate'

// When an invitation link stops working, in the viewer's own language and
// time zone — an expiry is a moment in time, not a calendar date (unlike a
// date of birth, which formatCalendarDate pins to UTC).
//
// Shared by every screen that shows an invitation: the create-user
// confirmation, the accept page, and the account's invitation status.
// Since 2026-10-08 it delegates to formatMomentDate, the general rule for
// "the day of a moment" (the care team's dates use it too); the name stays
// because it says what the callers are formatting.
export function formatExpiry(expiresAt: string): string {
  return formatMomentDate(expiresAt)
}