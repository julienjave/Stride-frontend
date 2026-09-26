import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/api/client'
import { useExercise } from '@/exercises/useExercise'
import { usePreferredWeightUnit } from '@/auth/usePreferredWeightUnit'
import { useProgram } from './useProgram'
import { addTemplateExercise, programQueryKey } from './api'
import {
  addTemplateExerciseSchema,
  type AddTemplateExerciseFormValues,
} from './schemas'
import { ExercisePhotoCarousel } from './ExercisePhotoCarousel'

// Screen filled in from the "Add New Exercise" card on TemplateDetailPage's
// exercise list. The exercise itself is picked via
// ExercisePickerPage (a real navigation, not a modal — see that page's
// own comment), which redirects back here with ?exerciseId=... in the
// URL; everything else on this page (sets/reps/duration/weight) is
// filled in only once that's present.
export function NewProgramExercisePage() {
  const { id } = useParams<{ id: string }>()
  const templateId = Number(id)

  if (!id || Number.isNaN(templateId)) {
    return <p className="text-sm text-destructive">Invalid template.</p>
  }

  return <NewProgramExerciseView templateId={templateId} />
}

function NewProgramExerciseView({ templateId }: { templateId: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const pickedExerciseIdParam = searchParams.get('exerciseId')
  const pickedExerciseId = pickedExerciseIdParam
    ? Number(pickedExerciseIdParam)
    : null

  const { data: template } = useProgram(templateId)
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
      return addTemplateExercise(templateId, pickedExerciseId, values)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(programQueryKey(templateId), updated)
      // Back to the template's own page — the one place a template is
      // managed — where the new card now shows at the end of the list.
      void navigate(`/practitioner/programs/templates/${templateId}`)
    },
  })

  const currentPath = `/practitioner/programs/templates/${templateId}/exercises/new`
  const pickerHref = `/practitioner/library/pick?returnTo=${encodeURIComponent(currentPath)}`
  const templateHref = `/practitioner/programs/templates/${templateId}`

  // useWatch, not form.watch(): same value, but a hook that subscribes
  // to just this field. form.watch() makes the React Compiler skip
  // optimizing this whole component (the "incompatible library" lint
  // warning), because the compiler can't tell when its result changes.
  const selectedWeightUnit = useWatch({ control: form.control, name: 'weightUnit' })

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <div>
        <h1 className="text-xl font-semibold">{template?.title ?? '…'}</h1>
        <p className="text-sm text-muted-foreground">- Add Exercise -</p>
      </div>

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
                to the exercise itself, not this template's usage of it.
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
            <Link to={templateHref}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={pickedExerciseId == null || addMutation.isPending}
          >
            {addMutation.isPending ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </form>
    </div>
  )
}