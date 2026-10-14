import { addDays, daysBetween, formatShortDate, isCalendarDate } from '@/common/calendarDate'
import { describeVersion, type WorkoutNames } from './programSchedule'
import type { ScheduleVersion } from './types'

// The program page's start and end dates (step 3b-2), as pure rules: when
// each may change, what's wrong with a new value, and what saving it would
// do — said BEFORE saving. The Details section (ProgramDetailsSection) only
// calls these; the tests check them with plain values — the same split as
// scheduleChange.ts for the schedule editor.
//
// The backend has the final word (start-date-move.ts, end-date.ts, the
// order check in AssignedProgramsService.update); these mirror it so the
// page offers only what will be accepted — stricter, never looser: `today`
// is the VIEWER's day, where the backend allows one day of slack for time
// zones (yesterday in UTC is someone's today).

// What the rules read from a program.
export interface ProgramDates {
  startDate: string
  // null = open-ended.
  endDate: string | null
  // Oldest first, as the backend sends them; never empty (every program
  // has a schedule from its start date).
  schedules: readonly ScheduleVersion[]
}

// One thing saving would do: a sentence, and the items it lists (schedule
// versions in words) — possibly none.
export interface DateNote {
  text: string
  items: string[]
}

// --- WHEN ---------------------------------------------------------------------------------------------------

// May the start date change? Only while the program hasn't started — from
// the viewer's today, its start is today or later. On its first day it
// hasn't been judged yet (today is never "missed"), which is also the
// backend's rule without its slack. Once started, the start is history:
// program weeks are counted from it, so moving it would re-cut weeks
// already judged (decisions §5, step 1b).
export function canMoveStart(program: Pick<ProgramDates, 'startDate'>, today: string): boolean {
  return program.startDate >= today
}

// The earliest end date the picker offers: today, or the start if later —
// an end can't be in the past (end-date.ts), nor before the start.
// ('YYYY-MM-DD' strings compare in date order — calendarDate.ts.)
export function earliestEndDate(program: Pick<ProgramDates, 'startDate'>, today: string): string {
  return program.startDate > today ? program.startDate : today
}

// --- WHAT'S WRONG -------------------------------------------------------------------------------------------

// The schedule version in force on `day`: the latest one starting on or
// before it — or, for a day before every version (a start moved EARLIER),
// the first one, which is the one brought forward. The backend's
// planStartDateMove reads it the same way. null only for no versions at all
// (which a program never has).
export function versionInForceOn(
  versions: readonly ScheduleVersion[],
  day: string,
): ScheduleVersion | null {
  let found: ScheduleVersion | null = versions[0] ?? null
  for (const version of versions) {
    if (version.effectiveFrom <= day) found = version
  }
  return found
}

// What's wrong with a new start date — null when nothing is. In the order
// the backend checks, so the message is the one it would give, said next
// to the field before any request. Only called for a CHANGED value
// (EditableField closes without saving when nothing changed).
export function startDateProblem(
  newStart: string,
  program: ProgramDates,
  today: string,
  locale?: string,
): string | null {
  if (!isCalendarDate(newStart)) return 'Choose a start date'
  if (newStart < today) return "The start date can't be moved into the past: choose today or later"
  if (program.endDate !== null && newStart > program.endDate) {
    // The backend says "The end date can't be before the start date" — true,
    // but about the OTHER field. Here: what to do about it.
    return `The program ends on ${formatShortDate(program.endDate, locale)}: choose that day or earlier, or move the end date first`
  }
  if (versionInForceOn(program.schedules, newStart)?.type === 'paused') {
    // The backend's own words: the schedule the program would START with
    // is a planned pause.
    return "A program can't start paused: the new start date falls in a planned pause"
  }
  return null
}

// What's wrong with a new end date ('' = none: open-ended, always fine) —
// null when nothing is. The backend's order: the end before the start
// first (the more basic explanation), then the past.
export function endDateProblem(
  newEnd: string,
  program: Pick<ProgramDates, 'startDate'>,
  today: string,
): string | null {
  if (newEnd === '') return null
  if (!isCalendarDate(newEnd)) return 'Choose an end date'
  if (newEnd < program.startDate) return "The end date can't be before the start date"
  if (newEnd < today) {
    return "The end date can't be moved into the past: to end the program now, complete or cancel it"
  }
  return null
}

// --- WHAT SAVING WOULD DO -----------------------------------------------------------------------------------

// Moving the start: the schedule moves with it (the backend's
// planStartDateMove, in the same transaction). Said as:
//   1. the schedule the program will start with — the version in force on
//      the new day, re-created there; with "N a week", its words include the
//      weekday program weeks will start on, which moves with the start;
//   2. the versions that will never apply: every other one starting before
//      the new day (the backend deletes them; the audit log keeps them).
// Versions starting later stay as they are. Nothing for an unusable value
// or the same day.
export function startMoveNotes(
  program: ProgramDates,
  newStart: string,
  names: WorkoutNames,
  locale?: string,
): DateNote[] {
  if (!isCalendarDate(newStart) || newStart === program.startDate) return []
  const inForce = versionInForceOn(program.schedules, newStart)
  if (!inForce) return []
  const notes: DateNote[] = [
    {
      text: 'The schedule moves with it:',
      items: [
        `From ${formatShortDate(newStart, locale)}: ${describeVersion(inForce, names, newStart)}`,
      ],
    },
  ]
  const dropped = program.schedules.filter(
    (version) => version.effectiveFrom < newStart && version.id !== inForce.id,
  )
  if (dropped.length > 0) {
    notes.push({
      text:
        dropped.length === 1
          ? 'What was set to begin before that day will never apply:'
          : `The ${dropped.length} versions set to begin before that day will never apply:`,
      items: dropped.map(
        (version) =>
          `From ${formatShortDate(version.effectiveFrom, locale)}: ${describeVersion(version, names, program.startDate)}`,
      ),
    })
  }
  return notes
}

// Moving the end EARLIER — or giving an open-ended program an end — cuts
// days off. What that changes beyond "fewer days" (decided with the person,
// 2026-10-13):
//   1. schedule versions planned to begin AFTER the new end will never
//      apply (the backend keeps them; no day reaches them);
//   2. with "N a week", a last program week cut short gets its target
//      scaled to its length — the summary's rule, round(N × days / 7) — so
//      "3 a week" over the last 3 days becomes 1. Said only when the target
//      really changes (cutting one day off a 3-a-week week still rounds to
//      3).
// Extending the end, or removing it (null), cuts nothing: no notes.
export function endChangeNotes(
  program: ProgramDates,
  newEnd: string | null,
  names: WorkoutNames,
  locale?: string,
): DateNote[] {
  if (newEnd === null || !isCalendarDate(newEnd)) return []
  const shortens = program.endDate === null || newEnd < program.endDate
  if (!shortens) return []
  const notes: DateNote[] = []

  const neverApply = program.schedules.filter((version) => version.effectiveFrom > newEnd)
  if (neverApply.length > 0) {
    notes.push({
      text:
        neverApply.length === 1
          ? 'The change planned after that day will never apply:'
          : `The ${neverApply.length} changes planned after that day will never apply:`,
      items: neverApply.map(
        (version) =>
          `From ${formatShortDate(version.effectiveFrom, locale)}: ${describeVersion(version, names, program.startDate)}`,
      ),
    })
  }

  const scaled = scaledLastWeek(program, newEnd)
  if (scaled) {
    const range = `${formatShortDate(scaled.weekStart, locale)} – ${formatShortDate(newEnd, locale)}`
    const length = `${scaled.days} ${scaled.days === 1 ? 'day' : 'days'}`
    notes.push({
      text:
        scaled.after === 0
          ? `The last program week will be ${range} (${length}), so no session will be expected that week (instead of ${scaled.before}).`
          : `The last program week will be ${range} (${length}), so its target becomes ${scaled.after} ${scaled.after === 1 ? 'session' : 'sessions'} instead of ${scaled.before}.`,
      items: [],
    })
  }
  return notes
}

// The last program week's target before and after the new end — or null
// when nothing about it changes (another kind of schedule that day, the end
// on a week's last day, or the same rounded target).
//
// The summary counts "N a week" in STRETCHES: the days of one program week
// under one version (a change mid-week splits a week in two, each part with
// its own target). The stretch that holds the new end:
//   - starts on the week's first day, or the version's first day if later;
//   - ended, BEFORE the change, on the week's last day — or earlier: the
//     old end date, or the day before the next version starts;
//   - ends, AFTER it, on the new end (the version is in force that day, so
//     the next one starts later, and the old end was later).
// Program weeks start on the start date's weekday (decisions §5, point 6):
// week k runs from start + 7k to start + 7k + 6.
function scaledLastWeek(
  program: ProgramDates,
  newEnd: string,
): { weekStart: string; days: number; before: number; after: number } | null {
  // Only an "N a week" version has a count (types.ts: `timesPerWeek` is
  // null for specific days and pauses) — the others have no target to
  // scale. One check says both, and gives TypeScript a number below.
  // (`!version` is for the type only: versionInForceOn is null just for a
  // program with no versions, which can't exist — a mutation removing it
  // survives, as it must.)
  const version = versionInForceOn(program.schedules, newEnd)
  if (!version || version.timesPerWeek === null) return null
  const perWeek = version.timesPerWeek

  const week = Math.floor(daysBetween(program.startDate, newEnd) / 7)
  const weekStart = addDays(program.startDate, 7 * week)
  const weekEnd = addDays(weekStart, 6)
  const stretchStart = version.effectiveFrom > weekStart ? version.effectiveFrom : weekStart

  const next = program.schedules.find((v) => v.effectiveFrom > version.effectiveFrom)
  const candidates = [weekEnd]
  if (program.endDate !== null) candidates.push(program.endDate)
  if (next) candidates.push(addDays(next.effectiveFrom, -1))
  const stretchEndBefore = candidates.reduce((earliest, day) => (day < earliest ? day : earliest))

  // round(N × days / 7): no .5 tie can happen (N and days are below 7, or N
  // is 7 and the result whole), so Math.round agrees with the backend.
  const target = (from: string, to: string) =>
    Math.round((perWeek * (daysBetween(from, to) + 1)) / 7)
  const before = target(stretchStart, stretchEndBefore)
  const after = target(stretchStart, newEnd)
  if (before === after) return null
  return { weekStart, days: daysBetween(weekStart, newEnd) + 1, before, after }
}