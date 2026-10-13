import { addDays, daysBetween } from '@/common/calendarDate'
import type { CountedWeek, ExtraSession, ScheduleSummary, ScheduledDay } from './types'

// The program page's progress list (decided 2026-10-12): the backend's
// summary — scheduled days, weekly counts, extra sessions, pauses — cut into
// PROGRAM WEEKS, the current week first and open, earlier weeks below,
// newest first, folded.
//
// The backend already JUDGES everything (done, missed, made up…); this file
// only ARRANGES its answer for the screen. It never decides a state — that
// stays in the one schedule module (decisions §5: screens ask it, none
// branch on the schedule type).

// --- ONE PROGRAM WEEK -------------------------------------------------------------

// Everything the summary says about one program week. A week can hold
// scheduled days (specific-days versions) AND weekly counts ("N a week"
// versions) at once, when the schedule changed kind mid-week — so both
// lists are kept, and screens show whichever are there.
export interface ProgressWeek {
  // 1 = the week starting on the program's start date.
  programWeek: number
  start: string
  // Day 7 of the week, or the program's last covered day if sooner (an end
  // date in the middle of the week).
  end: string
  days: ScheduledDay[]
  counted: CountedWeek[]
  extras: ExtraSession[]
  // The pauses that touch this week, each cut to the week's own dates.
  pauses: { from: string; to: string }[]
  // How much the week asked for (scheduled days + weekly targets), how much
  // of it was fulfilled (done, made up or swapped) and how much missed.
  expected: number
  fulfilled: number
  missed: number
}

// A date's program week: days 0–6 after the start are week 1, 7–13 week 2…
// Math.floor, not Math.trunc: a session BEFORE the start (−1 day) must land
// in week 0, not week 1 — trunc would round −1/7 up to 0 and put it there.
export function programWeekOf(date: string, startDate: string): number {
  return Math.floor(daysBetween(startDate, date) / 7) + 1
}

// The fulfilled states of a scheduled day: the patient did what the day
// asked, one way or another. Kept apart in the totals (the backend counts
// made-up, done-early and swapped days apart), but each one fulfils its day.
const FULFILLED: ReadonlySet<ScheduledDay['state']> = new Set([
  'done',
  'made_up',
  'done_early',
  'swapped',
])

// The summary cut into weeks 1 … the week of its last covered day, in week
// order. Every week is listed, even an empty one (a pause, or a week with
// nothing scheduled yet), so the list never has a hole that reads as "data
// missing".
//
// Extra sessions dated outside every week (before the start, or after the
// last covered day — the backend's 'outside_program') are returned apart:
// they belong to no week, but a practitioner should still see them.
export function groupProgressByWeek(
  summary: ScheduleSummary,
  startDate: string,
): { weeks: ProgressWeek[]; outside: ExtraSession[] } {
  const weekCount = programWeekOf(summary.lastDay, startDate)

  const weeks: ProgressWeek[] = []
  for (let programWeek = 1; programWeek <= weekCount; programWeek += 1) {
    const start = addDays(startDate, 7 * (programWeek - 1))
    // The earlier of "day 7" and the last covered day: 'YYYY-MM-DD' strings
    // compare as dates, so the smaller string is the earlier day.
    const seventhDay = addDays(start, 6)
    const end = seventhDay < summary.lastDay ? seventhDay : summary.lastDay

    const days = summary.days.filter((day) => day.date >= start && day.date <= end)
    // A weekly count carries its own week number — no date arithmetic needed.
    const counted = summary.weeks.filter((week) => week.programWeek === programWeek)
    const extras = summary.extraSessions.filter(
      (extra) => extra.date >= start && extra.date <= end,
    )
    // A pause touches the week when it starts before the week ends AND ends
    // after the week starts (or never ends) — the classic test for two
    // ranges overlapping. Then cut to the week, so each week says only its
    // own part ("Paused Mon 5 Oct – Sun 11 Oct").
    const pauses = summary.pauses
      .filter((pause) => pause.from <= end && (pause.to === null || pause.to >= start))
      .map((pause) => ({
        from: pause.from > start ? pause.from : start,
        to: pause.to !== null && pause.to < end ? pause.to : end,
      }))

    weeks.push({
      programWeek,
      start,
      end,
      days,
      counted,
      extras,
      pauses,
      expected: days.length + counted.reduce((sum, week) => sum + week.target, 0),
      fulfilled:
        days.filter((day) => FULFILLED.has(day.state)).length +
        counted.reduce((sum, week) => sum + week.done, 0),
      // A weekly count that ended short misses what it lacked: 2 of 3 →
      // 1 missed. One still running ('in_progress') misses nothing yet.
      missed:
        days.filter((day) => day.state === 'missed').length +
        counted
          .filter((week) => week.state === 'missed')
          .reduce((sum, week) => sum + (week.target - week.done), 0),
    })
  }

  const outside = summary.extraSessions.filter(
    (extra) => extra.date < startDate || extra.date > summary.lastDay,
  )
  return { weeks, outside }
}

// --- WHICH WEEK IS OPEN ------------------------------------------------------------

// Which week the list opens on, and why — the heading says it:
//   - 'current': today is inside the program — this week.
//   - 'last': the program is over (a closed program, or past its end date)
//     — its last week, the most recent the practitioner can look at.
//   - 'first': it hasn't started — its first week.
export type FocusRole = 'current' | 'last' | 'first'

export interface ArrangedWeeks {
  focus: ProgressWeek
  focusRole: FocusRole
  // Before the open week, NEWEST first: the most recent past is what a
  // practitioner looks at next ("how did last week go?").
  earlier: ProgressWeek[]
  // After it, SOONEST first — the order things will happen.
  later: ProgressWeek[]
}

// null only for a list with no week at all (a summary always covers at
// least the start date, so it doesn't happen — but a screen must not crash
// on it either).
export function arrangeWeeks(weeks: readonly ProgressWeek[], today: string): ArrangedWeeks | null {
  if (weeks.length === 0) return null

  let index = weeks.findIndex((week) => week.start <= today && today <= week.end)
  let focusRole: FocusRole = 'current'
  if (index === -1) {
    // Not inside any week: either before the first or after the last.
    if (today < weeks[0].start) {
      index = 0
      focusRole = 'first'
    } else {
      index = weeks.length - 1
      focusRole = 'last'
    }
  }

  return {
    focus: weeks[index],
    focusRole,
    // slice() copies before reverse() — reverse() changes the array it's
    // called on, and `weeks` may be cached data.
    earlier: weeks.slice(0, index).reverse(),
    later: weeks.slice(index + 1),
  }
}