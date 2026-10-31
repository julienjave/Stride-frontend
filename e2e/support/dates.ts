// Calendar dates as the APP writes them ('YYYY-MM-DD'), for the requests a
// test sends. The app's rule (frontend common/calendarDate.ts) is the
// device's own day — and the config pins the browser to Europe/Paris, so the
// test computes "today" in that same zone, whatever the machine's own zone.
const ZONE = 'Europe/Paris'

export function todayInParis(now: Date = new Date()): string {
  // en-CA formats a date as YYYY-MM-DD — the shape needed, from Intl, with
  // no date library.
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(now)
}

// 1 = Monday … 7 = Sunday (ISO), the numbering the backend's schedules use.
export function isoWeekday(date: string): number {
  // Noon UTC: far from midnight, so no zone can move it to another day.
  const day = new Date(`${date}T12:00:00Z`).getUTCDay()
  return day === 0 ? 7 : day
}
