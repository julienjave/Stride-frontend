import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/api/client'
import { createExercise } from './api'
import { createExerciseSchema, type CreateExerciseFormValues } from './schemas'
import { DynamicStringListField } from './DynamicStringListField'

export function NewExercisePage() {
  const navigate = useNavigate()

  const form = useForm<CreateExerciseFormValues>({
    resolver: zodResolver(createExerciseSchema),
    defaultValues: {
      name: '',
      // primaryMuscles/instructions start with ONE row because the
      // backend requires at least one — secondaryMuscles/equipment start
      // empty because the backend doesn't. See DynamicStringListField's
      // own comment on why `required` drives both the starting count and
      // whether the first row can be deleted.
      primaryMuscles: [{ value: '' }],
      secondaryMuscles: [],
      equipment: [],
      instructions: [{ value: '' }],
    },
  })

  const createExerciseMutation = useMutation({
    mutationFn: createExercise,
    onSuccess: (exercise) => {
      // Straight to the photo-management screen, not the exercise detail
      // page. Per the design discussion: the exercise is already real
      // the moment this succeeds, so the natural next step in the agreed
      // two-screen flow is photos — this route isn't creation-flow-only
      // either, it'll also be reachable later from the exercise detail
      // page's own "Manage Photos" link once that page exists.
      void navigate(`/practitioner/library/${exercise.id}/photos`)
    },
  })

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <h1 className="text-xl font-semibold">Add New Exercise to the Library</h1>

      <form
        onSubmit={(e) =>
          void form.handleSubmit((values) =>
            createExerciseMutation.mutate(values),
          )(e)
        }
        className="space-y-6"
        noValidate
      >
        <div className="space-y-1">
          <Label htmlFor="name">Title</Label>
          <Input
            id="name"
            aria-invalid={!!form.formState.errors.name}
            {...form.register('name')}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <DynamicStringListField
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          name="primaryMuscles"
          label="Primary Muscles"
          addButtonLabel="Add primary muscle"
          required
        />

        <DynamicStringListField
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          name="secondaryMuscles"
          label="Secondary Muscles (optional)"
          addButtonLabel="Add secondary muscle"
          required={false}
        />

        <DynamicStringListField
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          name="equipment"
          label="Equipment (optional)"
          addButtonLabel="Add equipment"
          required={false}
        />

        <DynamicStringListField
          control={form.control}
          register={form.register}
          errors={form.formState.errors}
          name="instructions"
          label="Instructions"
          addButtonLabel="Add a Step"
          required
          multiline
        />

        {/* Photos: placeholder only. Real upload needs a real exercise
            id (POST /exercises/:id/images), which doesn't exist until
            this form submits successfully — see the design discussion
            for why this can only ever be a follow-up screen, not
            something live on this form. */}
        <div className="space-y-1">
          <span className="text-sm font-medium">Photos</span>
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            You'll be able to add photos once this exercise is created.
          </div>
        </div>

        {createExerciseMutation.isError && (
          <p className="text-sm text-destructive">
            {createExerciseMutation.error instanceof ApiError
              ? createExerciseMutation.error.messages.join(', ')
              : 'Something went wrong'}
          </p>
        )}

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={createExerciseMutation.isPending}>
            {createExerciseMutation.isPending
              ? 'Creating…'
              : 'Create Exercise'}
          </Button>
          <Link
            to="/practitioner/library"
            className="text-sm text-muted-foreground underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}