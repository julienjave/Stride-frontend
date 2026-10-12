import { addDays, isoWeekday } from '@/common/calendarDate'
import { weekdayName } from './scheduleDraft'

// The assign form's date shortcuts and hints, as pure functions of
// 'YYYY-MM-DD' strings. (Decisions §5, points 1 and 6.)

// "Start next Monday": the first Monday AFTER `today` — on a Monday, the
// following one (a week later). The button shows the date it will pick, so
// "next" never has to be interpreted. Why it exists: "N times a week"
// counts in PROGRAM weeks from the start date; a Monday start makes them
// calendar weeks, which some practitioners and patients find easier.
//
// isoWeekday: Monday 1 … Sunday 7. From day d, the next Monday is 8 − d days
// away: Tuesday (2) → 6 days, Sunday (7) → 1 day, Monday (1) → 7 days.
export function nextMonday(today: string): string {
  return addDays(today, 8 - isoWeekday(today))
}

// "Duration: N weeks" → the end date that gives exactly N full program
// weeks. The end date is INCLUDED in the program, so N weeks end on the
// day before the start's weekday: a Thursday start, 2 weeks → the
// Wednesday 13 days later. (start + 7N would add an eighth day to the last
// week — a short week whose target gets scaled down; the shortcut exists
// precisely to avoid that, decisions §5 point 6.)
export function endDateForWeeks(startDate: string, weeks: number): string {
  return addDays(startDate, 7 * weeks - 1)
}

// "Thursday to Wednesday": how a program week runs for this start date —
// shown under the start date when the schedule counts sessions per week,
// so "3 a week" is never read as a calendar week.
export function programWeekRange(startDate: string): string {
  const first = weekdayName(isoWeekday(startDate))
  const last = weekdayName(isoWeekday(addDays(startDate, 6)))
  return `${first} to ${last}`
}