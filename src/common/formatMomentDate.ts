// The DAY a moment happened (or will happen), in the viewer's own language
// AND time zone: "October 8, 2026", "8 octobre 2026". For timestamps —
// when someone joined a care team, when an invitation expires — which the
// backend sends as full ISO moments ('2026-10-08T17:12:00.000Z').
//
// Its sibling formatCalendarDate is for DATES with no time at all (a date
// of birth, a program's start date): it pins both reading and formatting to
// UTC so the stored day never shifts. A moment is the opposite case: 23:30
// in Paris IS the next day in UTC, and the viewer expects their own day.
//
// `locale` is only a parameter so tests can pin it; the app passes nothing,
// which means "the browser's language".
export function formatMomentDate(value: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(value))
}