import { useParams, useSearchParams, Link } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { Button } from '@/components/ui/button'
import { useExercise } from './useExercise'
import { canModifyExercise } from './permissions'
import { EditableExerciseTitle } from './EditableExerciseTitle'
import { EditableExerciseListField } from './EditableExerciseListField'
import { ArchiveExerciseButton } from './ArchiveExerciseButton'
import type { ExerciseDetail } from './types'

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const exerciseId = Number(id)

  // Same split-component convention as ClinicEditPage/ExercisePhotosPage
  // — validate the URL param before any hook that needs a real id runs.
  if (!id || Number.isNaN(exerciseId)) {
    return <p className="text-sm text-destructive">Invalid exercise.</p>
  }

  return <ExerciseDetailView exerciseId={exerciseId} />
}

function ExerciseDetailView({ exerciseId }: { exerciseId: number }) {
  const { data: exercise, isLoading, isError } = useExercise(exerciseId)
  // RequireAuth already guarantees a real session by the time this
  // renders, so data here should never actually be undefined — but see
  // RequireRole's own identical defensive reasoning for why checking
  // anyway costs nothing.
  const { data: currentUser } = useCurrentUser()
  const [searchParams] = useSearchParams()
  // Backward-compatible: the normal Library-browse-then-view flow never
  // sets this, so it stays undefined there and the button below keeps
  // its exact original behavior and wording. Only set when something
  // links here with a specific place to return to — currently
  // ProgramExercisePage's own "Find it in Library" link.
  const returnTo = searchParams.get('returnTo')

  if (isLoading) {
    return (
      <p className="mx-auto mt-12 max-w-2xl px-4 text-sm text-muted-foreground">
        Loading…
      </p>
    )
  }

  if (isError || !exercise) {
    return (
      <p className="mx-auto mt-12 max-w-2xl px-4 text-sm text-destructive">
        Couldn't load this exercise. Try refreshing.
      </p>
    )
  }

  const canEdit = currentUser ? canModifyExercise(exercise, currentUser) : false

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-4 px-4">
      <EditableExerciseTitle
        exerciseId={exerciseId}
        name={exercise.name}
        canEdit={canEdit}
      />

      {/* Omitted entirely (not "by —") for the shared api-sourced
          library, which has no author at all — same reasoning as
          ExerciseCard's own identical comment. Never editable, per the
          design discussion, so this is plain text with no field
          component at all. */}
      {exercise.author && (
        <p className="text-sm text-muted-foreground">
          by {exercise.author.firstName} {exercise.author.lastName}
        </p>
      )}

      <div className="divide-y divide-border rounded-lg border px-4">
        <EditableExerciseListField
          exerciseId={exerciseId}
          fieldKey="primaryMuscles"
          label="Primary Muscles"
          addButtonLabel="Add primary muscle"
          values={exercise.primaryMuscles}
          canEdit={canEdit}
          itemMaxLength={100}
          minCount={1}
          maxCount={20}
          itemLabel="primary muscle"
        />
        <EditableExerciseListField
          exerciseId={exerciseId}
          fieldKey="secondaryMuscles"
          label="Secondary Muscles"
          addButtonLabel="Add secondary muscle"
          values={exercise.secondaryMuscles}
          canEdit={canEdit}
          itemMaxLength={100}
          maxCount={20}
          itemLabel="secondary muscle"
        />
        <EditableExerciseListField
          exerciseId={exerciseId}
          fieldKey="equipment"
          label="Equipment"
          addButtonLabel="Add equipment"
          values={exercise.equipment}
          canEdit={canEdit}
          itemMaxLength={100}
          maxCount={20}
          itemLabel="equipment item"
        />
      </div>

      <ExercisePhotosSection
        exerciseId={exerciseId}
        exerciseName={exercise.name}
        images={exercise.images}
        canEdit={canEdit}
      />

      <div className="rounded-lg border px-4">
        <EditableExerciseListField
          exerciseId={exerciseId}
          fieldKey="instructions"
          label="Instructions"
          addButtonLabel="Add a Step"
          values={exercise.instructions}
          canEdit={canEdit}
          multiline
          itemMaxLength={500}
          minCount={1}
          maxCount={50}
          itemLabel="instruction"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        {/* Shown for every exercise, shared or own — assigning an
            existing exercise into a program is a different capability
            from editing the exercise's own definition, per the design
            discussion. Its own page is a separate future design item;
            this route exists now so there's no dead link. */}
        <Button asChild>
          <Link to={`/practitioner/library/${exerciseId}/assign`}>
            Assign
          </Link>
        </Button>
        {canEdit && (
          <ArchiveExerciseButton
            exerciseId={exerciseId}
            exerciseName={exercise.name}
          />
        )}
        <Button asChild variant="outline">
          <Link to={returnTo ?? '/practitioner/library'}>
            {returnTo ? 'Back' : 'Back to Library'}
          </Link>
        </Button>
      </div>
    </div>
  )
}

interface ExercisePhotosSectionProps {
  exerciseId: number
  exerciseName: string
  images: ExerciseDetail['images']
  canEdit: boolean
}

// Read-only preview here — actual upload/reorder/removal all happen on
// the dedicated photo-management screen (ExercisePhotosPage), reached
// via the Manage Photos button below rather than an inline pencil icon.
// Per the design discussion, this section deliberately does NOT get the
// same edit-in-place treatment as the fields above it.
function ExercisePhotosSection({
  exerciseId,
  exerciseName,
  images,
  canEdit,
}: ExercisePhotosSectionProps) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Photos</p>
        {canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link to={`/practitioner/library/${exerciseId}/photos`}>
              Manage Photos
            </Link>
          </Button>
        )}
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.objectKey}
              className={
                // The first image is the one used as the library card's
                // thumbnail/cover (see ExerciseCard/mediaUrls[0]'s own
                // reasoning on the backend) — a visible ring distinguishes
                // it from the rest of the gallery, not just its position
                // in the grid, which could otherwise be easy to miss.
                index === 0
                  ? 'relative overflow-hidden rounded-lg ring-2 ring-ring'
                  : 'relative overflow-hidden rounded-lg'
              }
            >
              <img
                src={image.url}
                alt={`${exerciseName} photo ${index + 1}`}
                className="h-20 w-full object-cover"
              />
              {index === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-background/80 text-center text-xs">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}