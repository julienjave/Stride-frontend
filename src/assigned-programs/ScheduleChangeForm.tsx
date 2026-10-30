import { useState, type FormEvent } from 'react'
import { failureText } from '@/api/apiErrors'
import { addDays, formatShortDate, isCalendarDate } from '@/common/calendarDate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { describeDraft } from './describeSchedule'
import type { WorkoutNames } from './programSchedule'
import {
  backOnProblem,
  nextProgramWeekStart,
  replacedText,
  scheduleAfterPause,
  scheduleChangeProblems,
  startingDraft,
  toScheduleVersionInput,
  type ChangeWindow,
  type ScheduleChangeKind,
} from './scheduleChange'
import { ScheduleFields, type ScheduleWorkoutOption } from './ScheduleFields'
import type { AssignedProgramDetail } from './types'
import { useAddScheduleVersion } from './useAddScheduleVersion'

// The words that change with the kind: one table rather than a ternary in
// every place, so the three stay side by side and complete.
const TEXT = {
  change: {
    title: 'Change schedule',
    fromLabel: 'From',
    submit: 'Save schedule',
    pending: 'Saving…',
    dismiss: "Don't change",
  },
  pause: {
    title: 'Pause the program',
    fromLabel: 'Pause from',
    submit: 'Pause program',
    pending: 'Pausing…',
    dismiss: "Don't pause",
  },
  resume: {
    title: 'Resume the program',
    fromLabel: 'Resume from',
    submit: 'Resume program',
    pending: 'Resuming…',
    dismiss: 'Not now',
  },
} as const

interface ScheduleChangeFormProps {
  program: AssignedProgramDetail
  today: string
  kind: ScheduleChangeKind
  // The days allowed (changeWindow) — computed by the section, which only
  // offers the button when there is one. (Not called `window`: that would
  // hide the browser's global of the same name inside this component.)
  allowed: ChangeWindow
  names: WorkoutNames
  // Called after saving — with the program as saved — and by the dismiss
  // button, with nothing (nothing changed).
  onClose: (saved?: AssignedProgramDetail) => void
}

// "Change schedule", "Pause" and "Resume", inline in "Schedule & progress"
// (decided 2026-10-13: the practitioner keeps the weeks in view). All three
// add a schedule version from a chosen day (POST …/schedules); a pause has
// no schedule to edit.
//
// Plain useState, not react-hook-form: two values (the day and the draft),
// and every rule is one pure function (scheduleChangeProblems). The assign
// form has a dozen fields, registered inputs and per-field modes — there
// react-hook-form earns its place; here it would only add wiring.
//
// The form is MOUNTED when opened and unmounted when closed, so each
// opening starts fresh from the useState initialisers — no "reset" code.
export function ScheduleChangeForm({
  program,
  today,
  kind,
  allowed,
  names,
  onClose,
}: ScheduleChangeFormProps) {
  const text = TEXT[kind]
  const workoutIds = program.workouts.map((workout) => workout.id)
  const [from, setFrom] = useState(allowed.earliest)
  // A pause's optional back-on day (roadmap Phase 6.5): '' = none — an
  // open-ended pause, resumed later with "Resume", as before.
  const [backOn, setBackOn] = useState('')
  // A function as the initial value: computed on the first render only
  // (useState ignores its argument afterwards anyway; this skips the work).
  const [draft, setDraft] = useState(() =>
    startingDraft(program.schedules, workoutIds, today),
  )
  // Problems are shown only after a first try to save — not while the
  // practitioner is still filling the form in (react-hook-form's default,
  // kept here so both forms behave alike).
  const [triedToSave, setTriedToSave] = useState(false)
  const addVersion = useAddScheduleVersion(program.id)

  const problems = {
    ...scheduleChangeProblems(kind, from, draft, program, today),
    ...(kind === 'pause' ? { backOn: backOnProblem(backOn, from, program) } : {}),
  }
  // A key whose value is undefined isn't a problem (backOnProblem answers
  // undefined for a fine day) — so problems are counted by VALUE.
  const hasProblems = Object.values(problems).some((problem) => problem !== undefined)
  const shown = triedToSave ? problems : {}
  // What comes back on the back-on day, said before saving.
  const comesBack =
    kind === 'pause' && isCalendarDate(backOn)
      ? scheduleAfterPause(program.schedules, from, names, program.startDate)
      : null
  const replaced = isCalendarDate(from)
    ? replacedText(program.schedules, from, names, program.startDate)
    : null
  const weekStart = isCalendarDate(from) ? nextProgramWeekStart(program.startDate, from) : null
  const offerWeekStart =
    kind !== 'pause' &&
    draft.type === 'times_per_week' &&
    weekStart !== null &&
    (allowed.latest === null || weekStart <= allowed.latest)

  const options: ScheduleWorkoutOption[] = program.workouts.map((workout) => ({
    ref: workout.id,
    letter: names.letterOf(workout.id),
    label: names.labelOf(workout.id),
  }))
  const preview =
    kind === 'pause' ? null : describeDraft(draft, workoutIds, names.letterOf, program.startDate)

  function save(event: FormEvent) {
    // A form's submit reloads the page by default; preventDefault keeps the
    // single-page app in charge.
    event.preventDefault()
    setTriedToSave(true)
    if (hasProblems) return
    // The per-call onSuccess runs AFTER the hook's own (awaited) onSuccess:
    // the form closes once the page shows the new schedule and progress.
    addVersion.mutate(toScheduleVersionInput(kind, from, draft, workoutIds, backOn), {
      onSuccess: (saved) => onClose(saved),
    })
  }

  return (
    <form
      onSubmit={save}
      // A labelled region: screen readers announce "Change schedule, form".
      aria-labelledby="schedule-change-title"
      className="space-y-4 rounded-lg border p-3"
      noValidate
    >
      <h3 id="schedule-change-title" className="text-sm font-semibold">
        {text.title}
      </h3>

      <div className="space-y-1">
        <Label htmlFor="schedule-change-from">{text.fromLabel}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="schedule-change-from"
            type="date"
            className="w-auto"
            // The browser's date picker greys out the days outside this
            // range. A typed date can still be outside it — the check below
            // catches that.
            min={allowed.earliest}
            max={allowed.latest ?? undefined}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            aria-invalid={!!shown.from}
            aria-describedby={shown.from ? 'schedule-change-from-error' : undefined}
            // The form appears because the practitioner asked for it: their
            // next step is here.
            autoFocus
          />
          {offerWeekStart && (
            <Button type="button" variant="outline" size="sm" onClick={() => setFrom(weekStart)}>
              Next program week ({formatShortDate(weekStart)})
            </Button>
          )}
        </div>
        {shown.from && (
          <p id="schedule-change-from-error" className="text-sm text-destructive">
            {shown.from}
          </p>
        )}
        {offerWeekStart && (
          <p className="text-sm text-muted-foreground">
            A change in the middle of a program week splits it: each part's target is scaled to its
            length.
          </p>
        )}
      </div>

      {kind === 'pause' ? (
        <>
          {/* "Back on", optional (roadmap Phase 6.5; the person's choice:
              the first day the schedule applies again — the meaning of every
              version's start). Empty = an open-ended pause, as before. */}
          <div className="space-y-1">
            <Label htmlFor="schedule-change-back-on">Back on (optional)</Label>
            <Input
              id="schedule-change-back-on"
              type="date"
              className="w-auto"
              // The day after the pause starts at the earliest; the
              // program's last day at the latest. A typed day outside is
              // caught by backOnProblem.
              min={isCalendarDate(from) ? addDays(from, 1) : undefined}
              max={allowed.latest ?? undefined}
              value={backOn}
              onChange={(event) => setBackOn(event.target.value)}
              aria-invalid={!!shown.backOn}
              aria-describedby={
                shown.backOn ? 'schedule-change-back-on-error' : 'schedule-change-back-on-hint'
              }
            />
            {shown.backOn ? (
              <p id="schedule-change-back-on-error" className="text-sm text-destructive">
                {shown.backOn}
              </p>
            ) : (
              <p id="schedule-change-back-on-hint" className="text-sm text-muted-foreground">
                The first day the patient follows the schedule again. Leave it empty if you don't
                know yet.
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {comesBack
              ? `From that day, nothing is due and no day counts as missed. From ${formatShortDate(backOn)}, the schedule comes back: ${comesBack}.`
              : 'From that day, nothing is due and no day counts as missed. Resume the program when the patient is ready.'}
          </p>
        </>
      ) : (
        <>
          <ScheduleFields
            value={draft}
            onChange={setDraft}
            workouts={options}
            error={shown.schedule}
          />
          {preview && (
            <p className="text-sm">
              <span className="text-muted-foreground">New schedule:</span> {preview}
            </p>
          )}
        </>
      )}

      {replaced && (
        <div className="space-y-1 rounded-md border border-amber-600/40 bg-amber-500/10 p-3 text-sm">
          <p>{replaced.heading}</p>
          <ul className="list-disc pl-5">
            {replaced.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {addVersion.isError && (
        // The backend's own words: they say what was refused and why (a
        // change at the same moment by a colleague, a program closed since).
        <p role="alert" className="text-sm text-destructive">
          {failureText(addVersion.error, "Couldn't save. Check your connection and try again.")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={addVersion.isPending}>
          {addVersion.isPending ? text.pending : text.submit}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={addVersion.isPending}
          onClick={() => onClose()}
        >
          {text.dismiss}
        </Button>
      </div>
    </form>
  )
}