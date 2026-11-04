/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest'
import type { ProgramWorkout, ScheduleSummary } from '@/assigned-programs/types'
import { todayRow, workoutLabel } from './todayRow'
import { A, B, TODAY, scheduledDay, summary } from './testData'

// The row's words and buttons are covered through the home's page tests
// (PatientHomePage.test.tsx, unchanged by the move); these check what the
// move ADDED — the hub's placement ('apart') — and the label helper.

const WORKOUTS: ProgramWorkout[] = [
  { id: A, assignedProgramId: 12, name: 'Mobility', sortOrder: 0 },
  { id: B, assignedProgramId: 12, name: 'Strength', sortOrder: 1 },
]
const PROGRAM = { id: 12, workouts: WORKOUTS }

// A free day today with an on-time catch-up (Wednesday 11's B) and a late
// one waiting (Monday 2's A).
const CATCH_UP = summary({
  days: [scheduledDay('2031-06-11', B, 'due')],
  nextWorkout: { workoutId: B, forDay: '2031-06-11', programWeek: null, until: '2031-06-13' },
  lateMakeUps: { days: [{ forDay: '2031-06-02', workoutId: A, until: '2031-06-14' }], blockedToday: null },
})
// Only the late one.
const LATE_ONLY = summary({
  lateMakeUps: { days: [{ forDay: '2031-06-02', workoutId: A, until: '2031-06-14' }], blockedToday: null },
})

describe('workoutLabel', () => {
  it('names the workout when there are several, nothing with one', () => {
    expect(workoutLabel({ workouts: WORKOUTS }, B)).toBe('B · Strength')
    expect(workoutLabel({ workouts: [WORKOUTS[0]] }, A)).toBeNull()
  })
})

describe('todayRow — make-ups in the row (the home)', () => {
  it('offers the catch-up, and notes the late one also possible', () => {
    const row = todayRow(PROGRAM, CATCH_UP, TODAY)
    expect(row?.text.line).toBe("Catch up: Wednesday's B · Strength")
    expect(row?.action).toStrictEqual({ verb: 'Start', to: '/patient/sessions/start/12' })
    expect(row?.notes).toHaveLength(1)
  })

  it('offers the late one when it is all there is', () => {
    expect(todayRow(PROGRAM, LATE_ONLY, TODAY)?.action).toStrictEqual({
      verb: 'Make it up',
      to: '/patient/sessions/start/12',
    })
  })
})

describe('todayRow — make-ups apart (the hub)', () => {
  // Their rows are in the hub's list, each with its button: the Today row
  // must not offer one of them a second time, nor note them.
  it.each<[string, ScheduleSummary]>([
    ['an on-time catch-up', CATCH_UP],
    ['a late make-up', LATE_ONLY],
  ])('has no row for %s', (_label, data) => {
    expect(todayRow(PROGRAM, data, TODAY, 'apart')).toBeNull()
  })

  // Not a make-up: the same row as the home's — words, Start and Skip.
  it("keeps today's own session as it is", () => {
    const due = summary({ days: [scheduledDay(TODAY, A, 'due')] })
    expect(todayRow(PROGRAM, due, TODAY, 'apart')).toStrictEqual(todayRow(PROGRAM, due, TODAY))
  })

  // A session left open on an earlier day is still said — it's about today
  // (the next start closes it), not a make-up — as the row's line.
  it('still says a session was left open earlier, beside a catch-up', () => {
    const leftOpen = summary({
      ...CATCH_UP,
      openSession: { sessionId: 30, localDate: '2031-06-10', workoutId: A },
    })
    const row = todayRow(PROGRAM, leftOpen, TODAY, 'apart')
    expect(row?.text.line).toMatch(/^Your session of .* was left open\./)
    expect(row?.notes).toStrictEqual([])
    expect(row?.action).toBeNull()
  })

  // Blocked today (today is a scheduled day — done): the home's row says
  // "Done for today" and notes the late ones waiting for a free day; apart,
  // the note goes — the list says it, with why.
  it('drops the waiting note, keeping the day', () => {
    const doneToday = summary({
      ...LATE_ONLY,
      lateMakeUps: { ...LATE_ONLY.lateMakeUps, blockedToday: 'not_a_free_day' },
      days: [scheduledDay(TODAY, A, 'done')],
    })
    expect(todayRow(PROGRAM, doneToday, TODAY)?.notes).toHaveLength(1)
    expect(todayRow(PROGRAM, doneToday, TODAY, 'apart')).toStrictEqual({
      text: { line: 'Done for today', detail: null },
      notes: [],
      action: null,
      secondary: null,
    })
  })
})