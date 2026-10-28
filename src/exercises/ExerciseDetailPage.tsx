import { useParams, useSearchParams, Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { RecordLoadFailed, RecordNotFound } from '@/common/RecordNotFound'
import { useRetryFocus } from '@/common/useRetryFocus'
import { Button } from '@/components/ui/button'
import { exerciseQueryKey, updateExercise } from './api'
import type { UpdateExercisePayload } from './api'
import { EXERCISE_LIST_RULES } from './descriptionRules'
import { localPath } from './pickerReturnHref'
import { useExercise } from './useExercise'
import { canModifyExercise } from './permissions'
import { EditableExerciseTitle } from './EditableExerciseTitle'
import { EditableExerciseListField } from './EditableExerciseListField'
import { ArchiveExerciseButton } from './ArchiveExerciseButton'
import type { ExerciseDetail } from './types'
import { Loading } from '@/common/Loading'

// Where to go when this page can't show its exercise (RecordNotFound).
const WAYS_OUT: [{ to: string; label: string }] = [
  { to: '/practitioner/library', label: 'Exercise Library' },
]

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const exerciseId = Number(id)

  // Same split-component convention as ClinicEditPage/ExercisePhotosPage
  // — validate the URL param before any hook that needs a real id runs.
  // An id that isn't a number can't be an exercise: the same page as a 404.
  if (!id || Number.isNaN(exerciseId)) {
    return <RecordNotFound noun="exercise" links={WAYS_OUT} />
  }

  return <ExerciseDetailView exerciseId={exerciseId} />
}

function ExerciseDetailView({ exerciseId }: { exerciseId: number }) {
  const exerciseQuery = useExercise(exerciseId)
  const { data: exercise, isLoading } = exerciseQuery
  // After a "Try again" that worked, focus goes to the exercise's name —
  // the page's heading (useRetryFocus; matched by the load error's words).
  const heading = useRetryFocus<HTMLHeadingElement>('this exercise', exerciseQuery.isSuccess)
  // RequireAuth already guarantees a real session by the time this
  // renders, so data here should never actually be undefined — but see
  // RequireRole's own identical defensive reasoning for why checking
  // anyway costs nothing.
  const { data: currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // Backward-compatible: the normal Library-browse-then-view flow never
  // sets this, so it stays null there and the button below keeps
  // its exact original behavior and wording. Only set when something
  // links here with a specific place to return to — the exercise pages'
  // "Find it in Library" links. It comes from the address bar, so it is
  // kept a path on THIS site (localPath): `returnTo=https://elsewhere…`
  // would otherwise make Back an open redirect (deferred-improvements.md,
  // closed in step D-3, the next change to this page).
  const rawReturnTo = searchParams.get('returnTo')
  const returnTo = rawReturnTo === null ? null : localPath(rawReturnTo)

  // What saving one field of the description means HERE (the fields take a
  // `save` since step D-3; a program's page passes its own): PATCH the
  // exercise, put the answer in its cache entry — this page reads it, so it
  // shows the new value — and mark the library's lists stale: their cards
  // show the name and muscles too. (`exercises-list` is its own top-level
  // key, so this can't also invalidate the entry just written.)
  async function save(changes: UpdateExercisePayload) {
    const updated = await updateExercise(exerciseId, changes)
    queryClient.setQueryData(exerciseQueryKey(exerciseId), updated)
    void queryClient.invalidateQueries({ queryKey: ['exercises-list'] })
  }

  if (isLoading) {
    return <Loading className="mx-auto mt-12 max-w-2xl px-4" />
  }

  // A 404: no such exercise ("Exercise not found", no Try again). Anything
  // else: the load error with its reason and "Try again".
  if (exerciseQuery.isError || !exercise) {
    return (
      <RecordLoadFailed queries={[exerciseQuery]} what="this exercise" noun="exercise" links={WAYS_OUT} />
    )
  }

  const canEdit = currentUser ? canModifyExercise(exercise, currentUser) : false

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-4 px-4">
      <EditableExerciseTitle
        save={save}
        name={exercise.name}
        canEdit={canEdit}
        headingRef={heading}
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
        {(['primaryMuscles', 'secondaryMuscles', 'equipment'] as const).map(
          (fieldKey) => (
            <EditableExerciseListField
              key={fieldKey}
              save={save}
              fieldKey={fieldKey}
              values={exercise[fieldKey]}
              canEdit={canEdit}
              {...EXERCISE_LIST_RULES[fieldKey]}
            />
          ),
        )}
      </div>

      <ExercisePhotosSection
        exerciseId={exerciseId}
        exerciseName={exercise.name}
        images={exercise.images}
        canEdit={canEdit}
      />

      <div className="rounded-lg border px-4">
        <EditableExerciseListField
          save={save}
          fieldKey="instructions"
          values={exercise.instructions}
          canEdit={canEdit}
          {...EXERCISE_LIST_RULES.instructions}
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