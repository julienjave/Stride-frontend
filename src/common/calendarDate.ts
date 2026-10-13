// Calendar dates as 'YYYY-MM-DD' strings — the frontend twin of the
// backend's src/common/calendar-date.ts.
//
// Why strings and not Date objects: a JavaScript Date is a MOMENT (a point
// in time), not a day. new Date('2026-10-12') is midnight UTC, which is
// still the 11th in Montreal. A program's start date, a schedule's "from"
// date, a session's local date are DAYS — a Postgres `date` column, with no
// time and no zone — so they stay strings end to end. That format has a
// useful property: alphabetical order IS date order, so `<`, `>=` and
// sorting just work.
//
// When arithmetic is needed (add 7 days, which weekday is it), the string is
// turned into a Date at midnight UTC, computed IN UTC, and turned back. In
// UTC every day lasts exactly 24 hours — no daylight-saving day of 23 or 25
// hours to shift a result by one.

// '2026-10-12' → a Date at 2026-10-12T00:00:00Z. Only for computing; never
// shown to anyone (formatting a UTC midnight in the viewer's zone would show
// the previous evening west of Greenwich — see formatCalendarDate).
function toUtcMidnight(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

// The reverse: a Date → its UTC calendar day. toISOString() is always
// 'YYYY-MM-DDTHH:mm:ss.sssZ' in UTC, so its first 10 characters are the day.
function fromUtcMidnight(value: Date): string {
  return value.toISOString().slice(0, 10)
}

// A real calendar day in exactly the 'YYYY-MM-DD' shape. One check does
// both: build the Date, read its day back, compare. Any other shape either
// doesn't parse (NaN) or reads back differently ('2031-6-1' → '2031-06-01'),
// and a day that doesn't exist reads back as another one (2031-02-30 rolls
// over into March 2nd). A shape regex in front of it was tried and removed:
// a mutation check showed the round trip already refuses everything it
// would (any string that reads back identically IS in the shape).
export function isCalendarDate(value: string): boolean {
  const parsed = toUtcMidnight(value)
  return !Number.isNaN(parsed.getTime()) && fromUtcMidnight(parsed) === value
}

// '2026-10-12' + 3 → '2026-10-15'. Negative numbers go back.
export function addDays(date: string, days: number): string {
  const value = toUtcMidnight(date)
  value.setUTCDate(value.getUTCDate() + days)
  return fromUtcMidnight(value)
}

// The number of days from `from` to `to`: '2026-10-12' → '2026-10-15' is 3,
// and the other way round −3. Both are UTC midnights, so their difference
// is an exact multiple of 24 hours (86,400,000 ms) — no daylight-saving day
// to leave a remainder — and the division is exact: whole numbers of
// milliseconds this size are represented exactly, so no rounding is needed.
// (The backend's calendar-date.ts has the same function, written the same
// way.)
export function daysBetween(from: string, to: string): number {
  return (toUtcMidnight(to).getTime() - toUtcMidnight(from).getTime()) / 86_400_000
}

// ISO weekday: 1 = Monday … 7 = Sunday — the encoding the backend uses
// everywhere (Postgres `isodow`). getUTCDay() counts from Sunday = 0, so
// Sunday is moved to the end.
export function isoWeekday(date: string): number {
  const day = toUtcMidnight(date).getUTCDay()
  return day === 0 ? 7 : day
}

// Today as 'YYYY-MM-DD' in the VIEWER's time zone. Built from the local
// parts (getFullYear, getMonth, getDate), not from toISOString(), which is
// UTC's day — "tomorrow" for an evening user in Montreal. `now` is a
// parameter so tests can pin the clock.
//
// (Moved here from patients/patientPageRules.ts, where "Add a colleague"
// introduced it: the assign form needs the same "today", and one rule
// should have one definition.)
export function localDateString(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// A short, readable day: "Mon 19 Oct" in English, "lun. 19 oct." in French.
// Read AND formatted in UTC, for the same reason as formatCalendarDate: the
// day must stay the stored day whatever the viewer's zone. `locale` only so
// tests can pin it (the app passes nothing: the browser's language).
export function formatShortDate(date: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(toUtcMidnight(date))
}