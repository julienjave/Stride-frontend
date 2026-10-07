// When an invitation link stops working, in the viewer's own language and
// time zone — an expiry is a moment in time, not a calendar date (unlike a
// date of birth, which formatCalendarDate pins to UTC).
//
// Shared by every screen that shows an invitation: the create-user
// confirmation, the accept page, and the account's invitation status.
export function formatExpiry(expiresAt: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(expiresAt))
}