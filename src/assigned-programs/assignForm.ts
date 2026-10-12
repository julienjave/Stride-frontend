import { z } from 'zod'
import { isCalendarDate } from '@/common/calendarDate'
import { workoutLetter } from '@/common/workoutLabel'
import { endDateForWeeks } from './programDates'
import { resolveDays, resolveRotation, type ScheduleDraft } from './scheduleDraft'
import type { CreateAssignedProgramInput } from './types'

// The assign form's rules: what its fields hold, when they're valid, and
// how they become the POST /assigned-programs body. Pure — the page only
// wires them to react-hook-form; the tests check them with plain values.

// The longest "Duration: N weeks" the shortcut offers: two years. Longer
// programs can still pick an end date, or have none (open-ended).
export const MAX_DURATION_WEEKS = 104

// How the program ends. Three modes rather than one date field, because
// they're three different intentions (decisions §5, point 1): no end
// (open-ended — progress is then a count, not a bar), "N weeks" (the
// shortcut that fills the end date with whole program weeks), or a date.
export type EndMode = 'none' | 'weeks' | 'date'

const scheduleDraftSchema = z.object({
  type: z.enum(['weekdays', 'times_per_week']),
  days: z.array(z.object({ weekday: z.number(), workout: z.number().nullable() })),
  timesPerWeek: z.number().int().min(1).max(7),
  rotation: z.array(z.number()).nullable(),
})

export const assignFormSchema = z
  .object({
    // Select values are strings — '' until something is chosen (the same
    // convention as the invite form's clinic). The messages differ from the
    // selects' placeholders ("Choose a patient") on purpose, as there: the
    // same words twice on screen read as one thing.
    patientId: z.string().min(1, 'Select who this program is for'),
    templateId: z.string().min(1, 'Select the template to start from'),
    // trim() first, so "   " counts as empty; 200 = the backend's limit.
    title: z
      .string()
      .trim()
      .min(1, 'Give the program a title')
      .max(200, 'The title can be at most 200 characters'),
    startDate: z.string().refine(isCalendarDate, 'Choose a start date'),
    endMode: z.enum(['none', 'weeks', 'date']),
    // Kept as the input's text: an <input type="number"> still gives a
    // string, and '' (nothing typed) must be told apart from 0.
    durationWeeks: z.string(),
    endDate: z.string(),
    schedule: scheduleDraftSchema,
  })
  // Rules that involve SEVERAL fields — "the end date can't be before the
  // start", "a number is needed only when 'N weeks' is chosen" — can't live
  // on one field's schema. superRefine sees the whole object and reports
  // each problem on the field it belongs to (`path`), so the message shows
  // under the right input.
  .superRefine((values, ctx) => {
    if (values.endMode === 'weeks') {
      const weeks = Number(values.durationWeeks)
      // /^\d+$/ refuses '', '2.5', '-1' and '1e2' — Number() alone would
      // accept some of them.
      if (!/^\d+$/.test(values.durationWeeks) || weeks < 1 || weeks > MAX_DURATION_WEEKS) {
        ctx.addIssue({
          code: 'custom',
          path: ['durationWeeks'],
          message: `Enter a number of weeks between 1 and ${MAX_DURATION_WEEKS}`,
        })
      }
    }
    if (values.endMode === 'date') {
      if (!isCalendarDate(values.endDate)) {
        ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Choose an end date' })
      } else if (isCalendarDate(values.startDate) && values.endDate < values.startDate) {
        // 'YYYY-MM-DD' strings compare in date order (see calendarDate.ts).
        // The backend refuses it too (end ≥ start, a database CHECK); saying
        // it here saves a round trip and points at the field.
        ctx.addIssue({
          code: 'custom',
          path: ['endDate'],
          message: "The end date can't be before the start date",
        })
      }
    }
    if (values.schedule.type === 'weekdays' && values.schedule.days.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['schedule'], message: 'Tick at least one day' })
    }
  })

export type AssignFormValues = z.infer<typeof assignFormSchema>

// The end date the form will send, or null for open-ended — also what the
// form shows next to "Duration: N weeks" ("ends Wed 4 Nov"). Null too while
// the fields don't make a date yet, so the caller never shows a wrong one.
export function plannedEndDate(
  values: Pick<AssignFormValues, 'startDate' | 'endMode' | 'durationWeeks' | 'endDate'>,
): string | null {
  if (values.endMode === 'date') return isCalendarDate(values.endDate) ? values.endDate : null
  if (values.endMode === 'weeks') {
    const weeks = Number(values.durationWeeks)
    const usable =
      isCalendarDate(values.startDate) &&
      /^\d+$/.test(values.durationWeeks) &&
      weeks >= 1 &&
      weeks <= MAX_DURATION_WEEKS
    return usable ? endDateForWeeks(values.startDate, weeks) : null
  }
  return null
}

// Validated values → the request body. `workoutCount` is the chosen
// template's number of workouts: when assigning, workouts are named by
// POSITION (0 = A), so the references are simply 0 … count − 1.
//
// Only the chosen schedule type's fields are sent (the backend refuses the
// other type's fields — sending both would be a 400). A rotation is sent
// only when the practitioner edited it: "not edited" means "every workout
// in order", which is also what the backend does when none is sent, and a
// one-workout template has nothing to rotate.
export function toCreateInput(
  values: AssignFormValues,
  workoutCount: number,
): CreateAssignedProgramInput {
  const workouts = Array.from({ length: workoutCount }, (_, position) => position)
  const endDate = plannedEndDate(values)
  return {
    patientId: Number(values.patientId),
    basedOnTemplateId: Number(values.templateId),
    title: values.title.trim(),
    startDate: values.startDate,
    // A key that's absent, not `endDate: undefined`: JSON.stringify drops
    // undefined anyway, but tests compare objects, and "no key" is exactly
    // what "open-ended" is.
    ...(endDate ? { endDate } : {}),
    schedule: toNewSchedule(values.schedule, workouts),
  }
}

function toNewSchedule(
  draft: ScheduleDraft,
  workouts: number[],
): CreateAssignedProgramInput['schedule'] {
  if (draft.type === 'weekdays') {
    return {
      type: 'weekdays',
      days: resolveDays(draft.days, workouts).map((day) => ({
        weekday: day.weekday,
        workoutIndex: day.workout,
      })),
    }
  }
  return {
    type: 'times_per_week',
    timesPerWeek: draft.timesPerWeek,
    ...(draft.rotation !== null && workouts.length > 1
      ? { rotation: resolveRotation(draft, workouts) }
      : {}),
  }
}
// The title follows the template until the practitioner writes their own.
// Choosing a template fills the title with the template's; choosing ANOTHER
// one replaces it only if it's still empty or still exactly the previous
// template's title — a title the practitioner typed is never overwritten.
export function suggestTitle(
  currentTitle: string,
  previousTemplateTitle: string | null,
  nextTemplateTitle: string,
): string {
  const untouched = currentTitle.trim() === '' || currentTitle === previousTemplateTitle
  return untouched ? nextTemplateTitle : currentTitle
}

// Why a template can't be assigned yet, or null. The backend refuses both
// cases (400): a template with no exercises at all, and one with an EMPTY
// workout ("Workout B of program template 1 has no exercises") — an empty
// workout is fine while a template is being written, not on a patient's
// schedule. Saying it as soon as the template is chosen beats a refusal
// after the whole form is filled in.
export function templateProblem(template: {
  workouts: readonly { id: number; sortOrder: number }[]
  exercises: readonly { workoutId: number }[]
}): string | null {
  if (template.exercises.length === 0) {
    return 'This template has no exercises yet. Add some on its page before assigning it.'
  }
  const emptyPosition = [...template.workouts]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .findIndex((workout) => !template.exercises.some((ex) => ex.workoutId === workout.id))
  if (emptyPosition === -1) return null
  return `Workout ${workoutLetter(emptyPosition)} of this template has no exercises yet. Add some on the template's page before assigning it.`
}