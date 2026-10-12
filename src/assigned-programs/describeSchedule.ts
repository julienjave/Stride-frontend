import { isoWeekday } from '@/common/calendarDate'
import { weekdayName } from './scheduleDraft'

// A schedule in words — "Mon A · Wed B · Fri A", "3× a week · weeks start
// Thursday · A → B", "Paused". One function for every place that shows a
// schedule (the assign form's summary now; the program page and its
// planned changes in 3a-2), so they can never word it differently.
//
// It takes a plain shape rather than the API's types, because the form
// describes a DRAFT (workouts by position) and the program page a stored
// version (workouts by id): both are turned into this shape first.

export interface ScheduleToDescribe {
  type: 'weekdays' | 'times_per_week' | 'paused'
  days: readonly { weekday: number; workout: number }[]
  timesPerWeek: number | null
  rotation: readonly number[]
}

// labelOf: how to name a workout reference in the summary — its letter
// ("A"). null means "don't name workouts at all": a one-workout program
// shows "Mon · Wed · Fri", since "Mon A · Wed A · Fri A" would say nothing.
// The CALLER decides (it knows how many workouts there are) — once for the
// whole schedule, which is why it's "a function, or null" and not a
// function that may return null: naming some workouts and not others would
// make no sense, and this type can't express it.
//
// weekStart: the program's start date, for "weeks start Thursday" — N a
// week counts in PROGRAM weeks starting on the start date (decisions §5,
// point 6), and the words must say so wherever a count is shown, or "3 a
// week" gets read as Monday to Sunday.
export function describeSchedule(
  schedule: ScheduleToDescribe,
  labelOf: ((workout: number) => string) | null,
  weekStart?: string,
): string {
  if (schedule.type === 'paused') return 'Paused'

  if (schedule.type === 'weekdays') {
    return schedule.days
      .map((day) => {
        const name = weekdayName(day.weekday, 'short')
        return labelOf ? `${name} ${labelOf(day.workout)}` : name
      })
      .join(' · ')
  }

  const parts = [`${schedule.timesPerWeek}× a week`]
  if (weekStart) parts.push(`weeks start ${weekdayName(isoWeekday(weekStart))}`)
  // A rotation is worth showing only when there are workouts to name.
  if (labelOf) parts.push(schedule.rotation.map(labelOf).join(' → '))
  return parts.join(' · ')
}