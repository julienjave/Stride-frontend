import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useSearchParams, useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/api/client'
import { workoutLabel } from '@/common/workoutLabel'
import { useExercise } from '@/exercises/useExercise'
import { usePreferredWeightUnit } from '@/auth/usePreferredWeightUnit'
import {
  addTemplateExerciseSchema,
  type AddTemplateExerciseFormValues,
} from '@/programs/schemas'
import { ExercisePhotoCarousel } from '@/programs/ExercisePhotoCarousel'
import type { WorkoutLike } from './workoutGroups'

// The add-an-exercise form, for whatever has workouts — a template or an
// assigned program. Built for templates (NewProgramExercisePage, 3a-w) and
// lifted here in step 3b-1b when the program page needed the same page: the
// picker round trip, the workout in the address, the prescription form and
// its validation are the same; only the REQUEST and the cache entry differ,
// and those arrive as `add` (the `save` idea of EditableField: the caller
// says what adding means, the page only needs to know when it finished).
//
// The exercise itself is picked via ExercisePickerPage (a real navigation,
// not a modal — see that page's own comment), which redirects back here
// with ?exerciseId=... in the URL; everything else on this page
// (sets/reps/duration/weight) is filled in only once that's present.
//
// Which WORKOUT it goes into travels in the address too: the Add card of a
// several-workout resource links here with ?workoutId=58, and this page
// passes that on to the picker (inside `returnTo`), so it's still there
// when the picker sends the person back with the exercise.
//
// The form's rules are the template's (`addTemplateExerciseSchema`): the
// backend validates a program's prescription with the same rules (the
// same DTO fields — sets, reps, duration ≥ 1, a weight ≥ 0 with its unit).
export interface NewWorkoutExerciseViewProps {
  // "template" or "program", for the page's sentences.
  noun: string
  // The resource, once loaded — only what this page reads: its title and
  // its workouts in order.
  resource: { title: string; workouts: readonly WorkoutLike[] } | undefined
  // The resource's own page (`/practitioner/programs/templates/12`): Cancel
  // and a successful add go back there, and this page lives at
  // `${resourcePath}/exercises/new`.
  resourcePath: string
  // Adds the exercise — the request AND the cache write. `workoutId` null =
  // the address names no workout (a one-workout resource's Add card): the
  // backend then uses the first workout.
  add: (
    exerciseId: number,
    values: AddTemplateExerciseFormValues,
    workoutId: number | null,
  ) => Promise<unknown>
}

export function NewWorkoutExerciseView({
  noun,
  resource,
  resourcePath,
  add,
}: NewWorkoutExerciseViewProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pickedExerciseIdParam = searchParams.get('exerciseId')
  const pickedExerciseId = pickedExerciseIdParam
    ? Number(pickedExerciseIdParam)
    : null

  // The workout asked for, if any — a NUMBER from here on, or null when the
  // address names none (a one-workout resource's Add card).
  const workoutIdParam = searchParams.get('workoutId')
  const requestedWorkoutId = workoutIdParam === null ? null : Number(workoutIdParam)

  // Where it will go, once the resource is here: the workout asked for, or
  // the first one (where the backend puts an exercise when none is named).
  // -1 = the address names a workout this resource doesn't have (deleted
  // since the link was made, or a hand-edited address).
  const targetPosition = !resource
    ? null
    : requestedWorkoutId === null
      ? 0
      : resource.workouts.findIndex((workout) => workout.id === requestedWorkoutId)
  const workoutMissing = targetPosition === -1
  // Shown only when there's a choice to be clear about: with one workout,
  // "Adding to workout A" would only puzzle.
  const targetWorkoutLabel =
    resource && targetPosition !== null && targetPosition >= 0 && resource.workouts.length > 1
      ? workoutLabel(targetPosition, resource.workouts[targetPosition].name)
      : null
  const preferredWeightUnit = usePreferredWeightUnit()
  // enabled: only fetch once something's actually been picked — see
  // useExercise's own comment on why this couldn't just be a
  // conditional hook call.
  const {
    data: exercise,
    isLoading: isLoadingExercise,
    isError: isExerciseError,
  } = useExercise(pickedExerciseId ?? -1, pickedExerciseId != null)

  // z.preprocess (used for the NaN-from-empty-number-input handling —
  // see schemas.ts's own comment) makes this schema's INPUT type differ
  // from its OUTPUT type (unknown vs number, before/after the NaN check
  // runs) — RHF's three-generic useForm form reconciles that: the first
  // type is what register/watch work with, the third is what
  // handleSubmit's callback actually receives after zodResolver runs.
  const form = useForm<
    z.input<typeof addTemplateExerciseSchema>,
    unknown,
    AddTemplateExerciseFormValues
  >({
    resolver: zodResolver(addTemplateExerciseSchema),
    // The unit toggle starts on the practitioner's preferred unit, so a
    // practitioner who works in lbs doesn't have to switch it for every
    // exercise. Only a STARTING value: they can still pick the other
    // unit, and whichever is selected is what gets stored.
    //
    // defaultValues is read once, when the form is created. That's fine
    // here: the preference comes from /auth/me, loaded before any page
    // renders, so it's already known at that moment.
    defaultValues: { weightUnit: preferredWeightUnit },
  })

  const addMutation = useMutation({
    mutationFn: (values: AddTemplateExerciseFormValues) => {
      // The submit button is disabled without a picked exercise (see
      // below), so this should be unreachable — a defensive guard, not
      // a real code path, same reasoning as this app's other
      // "shouldn't happen but don't silently misbehave if it does" checks.
      if (pickedExerciseId == null) {
        throw new Error('No exercise selected')
      }
      return add(pickedExerciseId, values, requestedWorkoutId)
    },
    onSuccess: () => {
      // Back to the resource's own page — the one place it is managed —
      // where the new card now shows at the end of its workout.
      void navigate(resourcePath)
    },
  })

  // This page's own address WITH its workout, so the picker comes back to
  // the same workout.
  const workoutQuery = requestedWorkoutId === null ? '' : `?workoutId=${requestedWorkoutId}`
  const currentPath = `${resourcePath}/exercises/new${workoutQuery}`
  const pickerHref = `/practitioner/library/pick?returnTo=${encodeURIComponent(currentPath)}`

  // useWatch, not form.watch(): same value, but a hook that subscribes
  // to just this field. form.watch() makes the React Compiler skip
  // optimizing this whole component (the "incompatible library" lint
  // warning), because the compiler can't tell when its result changes.
  const selectedWeightUnit = useWatch({ control: form.control, name: 'weightUnit' })

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <div>
        <h1 className="text-xl font-semibold">{resource?.title ?? '…'}</h1>
        <p className="text-sm text-muted-foreground">- Add Exercise -</p>
        {targetWorkoutLabel && (
          <p className="text-sm">
            To workout <span className="font-medium">{targetWorkoutLabel}</span>
          </p>
        )}
      </div>

      {/* Refused rather than guessed: adding to "the first workout instead"
          would put the exercise somewhere the practitioner didn't choose. */}
      {workoutMissing && (
        <p role="alert" className="text-sm text-destructive">
          This workout is no longer part of the {noun}. Go back to the {noun}{' '}
          and use the Add card of the workout you want.
        </p>
      )}

      {pickedExerciseId == null ? (
        <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No exercise selected yet
          </p>
          <Button asChild>
            <Link to={pickerHref}>Select from Library</Link>
          </Button>
        </div>
      ) : isLoadingExercise ? (
        <p className="text-sm text-muted-foreground">Loading exercise…</p>
      ) : isExerciseError || !exercise ? (
        <p className="text-sm text-destructive">
          Couldn't load that exercise. Try selecting again.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{exercise.name}</h2>
            <Button asChild variant="outline" size="sm">
              <Link to={pickerHref}>Change</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Read-only — an exercise's own descriptive fields belong
                to the exercise itself, not this template's or program's
                usage of it.
                Editing them here would silently change the shared
                exercise for everyone using it, everywhere (see the
                design discussion on why muscles/equipment/instructions
                stay read-only in this context). */}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Primary Muscles
                </p>
                <p className="text-sm">
                  {exercise.primaryMuscles.length > 0
                    ? exercise.primaryMuscles.join(', ')
                    : 'None'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Secondary Muscles
                </p>
                <p className="text-sm">
                  {exercise.secondaryMuscles.length > 0
                    ? exercise.secondaryMuscles.join(', ')
                    : 'None'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Equipment</p>
                <p className="text-sm">
                  {exercise.equipment.length > 0
                    ? exercise.equipment.join(', ')
                    : 'None'}
                </p>
              </div>
            </div>

            <ExercisePhotoCarousel
              images={exercise.images}
              exerciseName={exercise.name}
            />
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Instructions</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {exercise.instructions.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) =>
          void form.handleSubmit((values) => addMutation.mutate(values))(e)
        }
        className="space-y-6"
        noValidate
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sets">Sets</Label>
              <Input
                id="sets"
                type="number"
                step="1"
                aria-invalid={!!form.formState.errors.sets}
                {...form.register('sets', { valueAsNumber: true })}
              />
              {form.formState.errors.sets && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.sets.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="reps">Reps</Label>
              <Input
                id="reps"
                type="number"
                step="1"
                aria-invalid={!!form.formState.errors.reps}
                {...form.register('reps', { valueAsNumber: true })}
              />
              {form.formState.errors.reps && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.reps.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="durationInSeconds">Duration (seconds)</Label>
              <Input
                id="durationInSeconds"
                type="number"
                step="1"
                aria-invalid={!!form.formState.errors.durationInSeconds}
                {...form.register('durationInSeconds', {
                  valueAsNumber: true,
                })}
              />
              {form.formState.errors.durationInSeconds && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.durationInSeconds.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="weight">Weight</Label>
              <div className="flex gap-2">
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  aria-invalid={!!form.formState.errors.weight}
                  {...form.register('weight', { valueAsNumber: true })}
                  className="flex-1"
                />
                {/* Not a native input — a two-state toggle, wired to
                    the form via setValue rather than register, since
                    there's no underlying <input> for RHF to bind to
                    directly. */}
                <div className="flex overflow-hidden rounded-md border">
                  {(['kg', 'lbs'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      aria-pressed={selectedWeightUnit === unit}
                      onClick={() =>
                        form.setValue('weightUnit', unit, {
                          shouldValidate: true,
                        })
                      }
                      className={
                        selectedWeightUnit === unit
                          ? 'bg-primary px-3 text-sm text-primary-foreground'
                          : 'px-3 text-sm text-muted-foreground hover:bg-muted'
                      }
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              {form.formState.errors.weight && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.weight.message}
                </p>
              )}
              {form.formState.errors.weightUnit && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.weightUnit.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {addMutation.isError && (
          <p className="text-sm text-destructive">
            {addMutation.error instanceof ApiError
              ? addMutation.error.messages.join(', ')
              : 'Something went wrong'}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Button asChild variant="outline">
            <Link to={resourcePath}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={pickedExerciseId == null || workoutMissing || addMutation.isPending}
          >
            {addMutation.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </form>
    </div>
  )
}