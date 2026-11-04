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
import {
  assignFormSchema,
  plannedEndDate,
  suggestTitle,
  templateProblem,
  toCreateInput,
  type AssignFormValues,
} from './assignForm'
import { emptyScheduleDraft, type ScheduleDraft } from './scheduleDraft'

// 2031-06-05 is a Thursday.
function values(overrides: Partial<AssignFormValues> = {}): AssignFormValues {
  return {
    patientId: '6',
    templateId: '1',
    basedOnProgramId: '',
    title: 'Knee Rehab — Pat',
    startDate: '2031-06-05',
    endMode: 'none',
    durationWeeks: '',
    endDate: '',
    schedule: {
      ...emptyScheduleDraft(),
      days: [
        { weekday: 1, workout: null },
        { weekday: 3, workout: null },
      ],
    },
    ...overrides,
  }
}

// Every validation message, keyed by the field it's shown under.
function messages(input: AssignFormValues): Record<string, string> {
  const result = assignFormSchema.safeParse(input)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]))
}

describe('assignFormSchema', () => {
  it('accepts a complete form', () => {
    expect(messages(values())).toStrictEqual({})
  })

  it('needs a patient, a template and a title that is more than spaces', () => {
    expect(messages(values({ patientId: '', templateId: '', title: '   ' }))).toStrictEqual({
      patientId: 'Select who this program is for',
      templateId: 'Select the template to start from',
      title: 'Give the program a title',
    })
  })

  // Assigning again: the source is the continued program, so no template
  // is needed — and none is asked for.
  it('needs no template when continuing a program', () => {
    expect(messages(values({ templateId: '', basedOnProgramId: '12' }))).toStrictEqual({})
  })

  it('limits the title to 200 characters, like the backend', () => {
    expect(messages(values({ title: 'x'.repeat(200) }))).toStrictEqual({})
    expect(messages(values({ title: 'x'.repeat(201) }))).toStrictEqual({
      title: 'The title can be at most 200 characters',
    })
  })

  it('needs a real start date', () => {
    expect(messages(values({ startDate: '' }))).toStrictEqual({ startDate: 'Choose a start date' })
    expect(messages(values({ startDate: '2031-02-29' }))).toStrictEqual({
      startDate: 'Choose a start date',
    })
  })

  it('needs a whole number of weeks from 1 to 104 — only when "weeks" is chosen', () => {
    const weeks = (durationWeeks: string) => messages(values({ endMode: 'weeks', durationWeeks }))
    const message = { durationWeeks: 'Enter a number of weeks between 1 and 104' }
    expect(weeks('1')).toStrictEqual({})
    expect(weeks('104')).toStrictEqual({})
    for (const wrong of ['', '0', '105', '2.5', '-1', '1e1']) {
      expect(weeks(wrong)).toStrictEqual(message)
    }
    // Another end mode: whatever is left in the box doesn't matter.
    expect(messages(values({ endMode: 'none', durationWeeks: 'nonsense' }))).toStrictEqual({})
  })

  it('needs an end date on or after the start — only when "a date" is chosen', () => {
    const on = (endDate: string) => messages(values({ endMode: 'date', endDate }))
    expect(on('2031-06-05')).toStrictEqual({}) // a one-day program is legitimate
    expect(on('')).toStrictEqual({ endDate: 'Choose an end date' })
    expect(on('2031-06-04')).toStrictEqual({
      endDate: "The end date can't be before the start date",
    })
    expect(messages(values({ endMode: 'weeks', durationWeeks: '2', endDate: '1999-01-01' }))).toStrictEqual({})
    // An impossible start (30 February) is ONE problem, reported once: no
    // second message comparing the end with a start that doesn't exist.
    expect(
      messages(values({ startDate: '2031-02-30', endMode: 'date', endDate: '2031-02-28' })),
    ).toStrictEqual({ startDate: 'Choose a start date' })
  })

  it('needs at least one day for a specific-days schedule — not for N a week', () => {
    const noDays: ScheduleDraft = { ...emptyScheduleDraft(), days: [] }
    expect(messages(values({ schedule: noDays }))).toStrictEqual({
      schedule: 'Tick at least one day',
    })
    expect(messages(values({ schedule: { ...noDays, type: 'times_per_week' } }))).toStrictEqual({})
  })
})

describe('plannedEndDate', () => {
  it('is none for an open-ended program', () => {
    expect(plannedEndDate(values({ endMode: 'none', endDate: '2031-07-01' }))).toBeNull()
  })

  it('is whole program weeks for "N weeks": a Thursday start, 2 weeks → Wednesday', () => {
    expect(plannedEndDate(values({ endMode: 'weeks', durationWeeks: '2' }))).toBe('2031-06-18')
  })

  it('is the chosen date for "a date"', () => {
    expect(plannedEndDate(values({ endMode: 'date', endDate: '2031-07-01' }))).toBe('2031-07-01')
  })

  it('is none while the fields do not make a date yet — never a wrong one', () => {
    expect(plannedEndDate(values({ endMode: 'weeks', durationWeeks: '' }))).toBeNull()
    expect(plannedEndDate(values({ endMode: 'weeks', durationWeeks: '0' }))).toBeNull()
    expect(plannedEndDate(values({ endMode: 'weeks', durationWeeks: '105' }))).toBeNull()
    expect(
      plannedEndDate(values({ endMode: 'weeks', durationWeeks: '2', startDate: '' })),
    ).toBeNull()
    expect(plannedEndDate(values({ endMode: 'date', endDate: '2031-02-30' }))).toBeNull()
  })
})

describe('toCreateInput', () => {
  it('builds the body: numbers for ids, a trimmed title, no end date when open-ended', () => {
    expect(toCreateInput(values({ title: '  Knee Rehab — Pat ' }), 2)).toStrictEqual({
      patientId: 6,
      basedOnTemplateId: 1,
      title: 'Knee Rehab — Pat',
      startDate: '2031-06-05',
      schedule: {
        type: 'weekdays',
        // Positions (workoutIndex), suggested A, B.
        days: [
          { weekday: 1, workoutIndex: 0 },
          { weekday: 3, workoutIndex: 1 },
        ],
      },
    })
  })

  // Assigning again: the continued program is the source, ALONE — a
  // template id left in the form isn't sent with it (two sources = 400).
  it('names the continued program as the only source when there is one', () => {
    const body = toCreateInput(values({ templateId: '1', basedOnProgramId: '12' }), 2)
    expect(body).toMatchObject({ patientId: 6, basedOnProgramId: 12 })
    expect(body).not.toHaveProperty('basedOnTemplateId')
  })

  it('sends the end date the chosen mode gives', () => {
    expect(toCreateInput(values({ endMode: 'weeks', durationWeeks: '2' }), 1).endDate).toBe(
      '2031-06-18',
    )
    expect(toCreateInput(values({ endMode: 'date', endDate: '2031-07-01' }), 1).endDate).toBe(
      '2031-07-01',
    )
  })

  it('sends a chosen workout as chosen', () => {
    const schedule: ScheduleDraft = {
      ...emptyScheduleDraft(),
      days: [{ weekday: 2, workout: 1 }],
    }
    expect(toCreateInput(values({ schedule }), 2).schedule).toStrictEqual({
      type: 'weekdays',
      days: [{ weekday: 2, workoutIndex: 1 }],
    })
  })

  it('sends N a week without a rotation when the order was not edited', () => {
    const schedule: ScheduleDraft = { ...emptyScheduleDraft(), type: 'times_per_week' }
    // toStrictEqual: the ABSENCE of `rotation` (and of `days`) is the point.
    expect(toCreateInput(values({ schedule }), 2).schedule).toStrictEqual({
      type: 'times_per_week',
      timesPerWeek: 3,
    })
  })

  it('sends the edited rotation', () => {
    const schedule: ScheduleDraft = {
      ...emptyScheduleDraft(),
      type: 'times_per_week',
      timesPerWeek: 2,
      rotation: [1, 0, 1],
    }
    expect(toCreateInput(values({ schedule }), 2).schedule).toStrictEqual({
      type: 'times_per_week',
      timesPerWeek: 2,
      rotation: [1, 0, 1],
    })
  })

  it('never sends a rotation for a one-workout template — even one left from another template', () => {
    const schedule: ScheduleDraft = {
      ...emptyScheduleDraft(),
      type: 'times_per_week',
      rotation: [0, 1],
    }
    expect(toCreateInput(values({ schedule }), 1).schedule).toStrictEqual({
      type: 'times_per_week',
      timesPerWeek: 3,
    })
  })
})

describe('suggestTitle', () => {
  it("fills an empty title with the template's", () => {
    expect(suggestTitle('', null, 'Knee Rehab')).toBe('Knee Rehab')
    expect(suggestTitle('  ', 'Back', 'Knee Rehab')).toBe('Knee Rehab')
  })

  it("follows the template while the title is still the previous template's", () => {
    expect(suggestTitle('Back Mobility', 'Back Mobility', 'Knee Rehab')).toBe('Knee Rehab')
  })

  it('never overwrites a title the practitioner wrote', () => {
    expect(suggestTitle('Knee Rehab — Pat', 'Knee Rehab', 'Back Mobility')).toBe(
      'Knee Rehab — Pat',
    )
    expect(suggestTitle('My plan', null, 'Back Mobility')).toBe('My plan')
  })
})

describe('templateProblem', () => {
  const workouts = [
    // Listed out of order on purpose: B before A.
    { id: 2, sortOrder: 1 },
    { id: 1, sortOrder: 0 },
  ]

  it('is none when every workout has exercises', () => {
    expect(templateProblem({ workouts, exercises: [{ workoutId: 1 }, { workoutId: 2 }] })).toBeNull()
  })

  it('names the empty workout by its letter, from its order', () => {
    expect(templateProblem({ workouts, exercises: [{ workoutId: 1 }] })).toBe(
      "Workout B of this template has no exercises yet. Add some on the template's page before assigning it.",
    )
    expect(templateProblem({ workouts, exercises: [{ workoutId: 2 }] })).toMatch(/^Workout A /)
  })

  it('says so when the template has no exercises at all', () => {
    expect(templateProblem({ workouts, exercises: [] })).toBe(
      'This template has no exercises yet. Add some on its page before assigning it.',
    )
  })

  // A closed program can't change any more: the advice is another source.
  it('words both cases for a program to continue', () => {
    expect(templateProblem({ workouts, exercises: [{ workoutId: 1 }] }, 'program')).toBe(
      "Workout B of the program to continue has no exercises, so it can't be assigned again. Assign a template instead.",
    )
    expect(templateProblem({ workouts, exercises: [] }, 'program')).toBe(
      "The program to continue has no exercises, so it can't be assigned again. Assign a template instead.",
    )
  })
})