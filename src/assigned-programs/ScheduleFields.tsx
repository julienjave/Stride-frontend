import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/common/NativeSelect'
import {
  MAX_ROTATION_LENGTH,
  WEEKDAYS,
  addRotationPosition,
  removeRotationAt,
  resetRotation,
  resolveDays,
  resolveRotation,
  setDayWorkout,
  setRotationAt,
  setTimesPerWeek,
  startEditingRotation,
  toggleDay,
  type ScheduleDraft,
  type ScheduleKind,
} from './scheduleDraft'

// The schedule editor: "Specific days" (a workout per ticked day) or "N
// times a week" (with a rotation). Used by the assign form and by the
// program page's "Change schedule" / "Resume" (ScheduleChangeForm, 3a-2).
//
// CONTROLLED: it holds no state of its own. The draft comes in as `value`,
// every change goes out through `onChange` as a NEW draft built by a pure
// function from scheduleDraft.ts. So the parent (react-hook-form, through
// a Controller) owns the value, validates it and submits it; this file only
// draws it. Even "is the rotation being edited?" isn't state: it's
// `value.rotation !== null`.
//
// `workouts` are the choosable workouts in order: a reference (a position
// when assigning, an id on a program — see scheduleDraft.ts), a label
// ("A · Mobility"), and its letter alone ("A") for the compact summaries.
// With ONE workout there's nothing to choose: no per-day
// pickers, no rotation.

export interface ScheduleWorkoutOption {
  ref: number
  letter: string
  label: string
}

interface ScheduleFieldsProps {
  value: ScheduleDraft
  onChange: (draft: ScheduleDraft) => void
  workouts: readonly ScheduleWorkoutOption[]
  // The schedule-level message from validation ("Tick at least one day").
  error?: string
}

const SCHEDULE_KINDS: { kind: ScheduleKind; label: string }[] = [
  { kind: 'weekdays', label: 'Specific days' },
  { kind: 'times_per_week', label: 'A number of times a week' },
]

export function ScheduleFields({ value, onChange, workouts, error }: ScheduleFieldsProps) {
  const refs = workouts.map((workout) => workout.ref)
  const hasChoice = workouts.length > 1
  // `?? '?'` can't happen: every reference drawn comes from resolveDays /
  // resolveRotation, which only return available workouts. It's there for
  // the type (find() may return undefined), and a mutation check confirms
  // nothing reaches it.
  const letterOf = (ref: number) =>
    workouts.find((workout) => workout.ref === ref)?.letter ?? '?'

  return (
    // A <fieldset> + <legend> groups the controls under one name, which
    // screen readers announce when entering the group ("Schedule, group").
    <fieldset className="space-y-3" aria-describedby={error ? 'schedule-error' : undefined}>
      <legend className="text-sm font-medium">Schedule</legend>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {SCHEDULE_KINDS.map(({ kind, label }) => (
          <label key={kind} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="schedule-type"
              checked={value.type === kind}
              onChange={() => onChange({ ...value, type: kind })}
            />
            {label}
          </label>
        ))}
      </div>

      {value.type === 'weekdays' ? (
        <WeekdayPicker
          value={value}
          onChange={onChange}
          refs={refs}
          hasChoice={hasChoice}
          workouts={workouts}
        />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="times-per-week" className="block text-sm">
              Sessions per week
            </label>
            <NativeSelect
              id="times-per-week"
              className="w-24"
              value={value.timesPerWeek}
              onChange={(event) => onChange(setTimesPerWeek(value, Number(event.target.value)))}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </NativeSelect>
          </div>
          {hasChoice && (
            <RotationEditor
              value={value}
              onChange={onChange}
              refs={refs}
              workouts={workouts}
              letterOf={letterOf}
            />
          )}
        </div>
      )}

      {error && (
        <p id="schedule-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}

// --- SPECIFIC DAYS -------------------------------------------------------------

function WeekdayPicker({
  value,
  onChange,
  refs,
  hasChoice,
  workouts,
}: {
  value: ScheduleDraft
  onChange: (draft: ScheduleDraft) => void
  refs: number[]
  hasChoice: boolean
  workouts: readonly ScheduleWorkoutOption[]
}) {
  // The workout each ticked day will really get — the chosen one, or the
  // suggestion. What the picker SHOWS is what will be sent.
  const resolved = resolveDays(value.days, refs)

  return (
    <ul className="divide-y divide-border rounded-lg border">
      {WEEKDAYS.map(({ weekday, long }) => {
        const day = resolved.find((entry) => entry.weekday === weekday)
        return (
          <li key={weekday} className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!day}
                onChange={() => onChange(toggleDay(value, weekday))}
              />
              {long}
            </label>
            {day && hasChoice && (
              // A visible label would repeat the day's name; aria-label gives
              // the picker its full name for screen readers ("Workout on
              // Monday") — and for tests.
              <NativeSelect
                aria-label={`Workout on ${long}`}
                className="w-auto max-w-[60%]"
                value={day.workout}
                onChange={(event) =>
                  onChange(setDayWorkout(value, weekday, Number(event.target.value)))
                }
              >
                {workouts.map((workout) => (
                  <option key={workout.ref} value={workout.ref}>
                    {workout.label}
                  </option>
                ))}
              </NativeSelect>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// --- THE ROTATION ------------------------------------------------------------------

function RotationEditor({
  value,
  onChange,
  refs,
  workouts,
  letterOf,
}: {
  value: ScheduleDraft
  onChange: (draft: ScheduleDraft) => void
  refs: number[]
  workouts: readonly ScheduleWorkoutOption[]
  letterOf: (ref: number) => string
}) {
  const rotation = resolveRotation(value, refs)
  // Letters only ("A → B"): the names are in the pickers below.
  const summary = rotation.map(letterOf).join(' → ')

  if (value.rotation === null) {
    return (
      <div className="space-y-1 text-sm">
        <p>
          Order: <span className="font-medium">{summary}</span>{' '}
          <span className="text-muted-foreground">(suggested)</span>
        </p>
        <p className="text-muted-foreground">
          The patient goes through the workouts in this order, carrying on from one week to the
          next.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(startEditingRotation(value, refs))}
        >
          Edit order
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2 text-sm">
      <p>
        Order: <span className="font-medium">{summary}</span>
      </p>
      <ol className="space-y-2">
        {rotation.map((ref, position) => (
          // The position is the right key here: the rows ARE positions (the
          // same workout can appear twice, so the workout can't be the key).
          <li key={position} className="flex items-center gap-2">
            <span className="w-6 text-right text-muted-foreground">{position + 1}.</span>
            <NativeSelect
              aria-label={`Workout ${position + 1} in the order`}
              className="w-auto"
              value={ref}
              onChange={(event) =>
                onChange(setRotationAt(value, refs, position, Number(event.target.value)))
              }
            >
              {workouts.map((workout) => (
                <option key={workout.ref} value={workout.ref}>
                  {workout.label}
                </option>
              ))}
            </NativeSelect>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Remove workout ${position + 1} from the order`}
              disabled={rotation.length <= 1}
              onClick={() => onChange(removeRotationAt(value, refs, position))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rotation.length >= MAX_ROTATION_LENGTH}
          onClick={() => onChange(addRotationPosition(value, refs))}
        >
          Add a workout to the order
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(resetRotation(value))}>
          Use the suggested order
        </Button>
      </div>
      {rotation.length >= MAX_ROTATION_LENGTH && (
        <p className="text-muted-foreground">
          An order can hold up to {MAX_ROTATION_LENGTH} workouts.
        </p>
      )}
    </div>
  )
}