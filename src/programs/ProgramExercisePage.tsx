import { Link, useLocation, useParams, useSearchParams, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { useExercise } from '@/exercises/useExercise'
import { useProgram } from './useProgram'
import { canEditTemplate } from './permissions'
import { removeTemplateExercise, programQueryKey } from './api'
import { EditableNumberField } from './EditableNumberField'
import { EditableWeightField } from './EditableWeightField'
import { EditableNotesField } from './EditableNotesField'
import { ExercisePhotoCarousel } from './ExercisePhotoCarousel'

// The View/Edit screen reached by clicking any exercise card on
// TemplateDetailPage's exercise list (the card passes its own page's
// URL as returnTo — see below). Sets/reps/duration/weight/notes are the per-template
// prescription data, editable inline exactly like the Library page's
// own EditableExerciseListField/EditableExerciseTitle — immediate save
// per field, no page-level Save button. The exercise's own
// name/muscles/equipment/instructions/photos stay read-only: templates
// keep a LIVE reference to the exercise (unlike assigned programs,
// which snapshot it), so editing those belongs on the exercise's own
// detail page, not here.
//
// For anyone who can't edit this template (another practitioner's, or
// an archived one — see canEditTemplate), the same page renders
// read-only: values shown, no pencils, no Remove button. Same "hide,
// don't disable" rule as TemplateDetailPage itself.
export function ProgramExercisePage() {
  const { id, templateExerciseId } = useParams<{
    id: string
    templateExerciseId: string
  }>()
  const templateId = Number(id)
  const rowId = Number(templateExerciseId)

  if (!id || Number.isNaN(templateId) || !templateExerciseId || Number.isNaN(rowId)) {
    return <p className="text-sm text-destructive">Invalid exercise.</p>
  }

  return <ProgramExerciseView templateId={templateId} rowId={rowId} />
}

function ProgramExerciseView({
  templateId,
  rowId,
}: {
  templateId: number
  rowId: number
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  // Falls back to the template's own page if missing (e.g. a direct/
  // stale URL with no returnTo) — every real link to this page includes
  // one, same defensive reasoning as ExercisePickerPage's own returnTo
  // check. The template page is the ONE place a template is managed
  // now, so it's the only sensible default.
  const returnTo =
    searchParams.get('returnTo') ??
    `/practitioner/programs/templates/${templateId}`

  const { data: template, isLoading, isError } = useProgram(templateId)
  const { data: currentUser } = useCurrentUser()
  const row = template?.exercises.find((exercise) => exercise.id === rowId)

  // Only fetch once the row (and therefore its exerciseId) is known —
  // same enabled pattern as NewProgramExercisePage.
  const {
    data: exercise,
    isLoading: isLoadingExercise,
    isError: isExerciseError,
  } = useExercise(row?.exerciseId ?? -1, row != null)

  const removeMutation = useMutation({
    mutationFn: () => removeTemplateExercise(templateId, rowId),
    onSuccess: (updated) => {
      queryClient.setQueryData(programQueryKey(templateId), updated)
      // The row no longer exists — staying on its own page makes no
      // sense regardless of where "Done" would otherwise go.
      void navigate(returnTo)
    },
  })

  if (isLoading) {
    return (
      <p className="mx-auto mt-12 max-w-2xl px-4 text-sm text-muted-foreground">
        Loading…
      </p>
    )
  }

  if (isError || !template || !row) {
    return (
      <p className="mx-auto mt-12 max-w-2xl px-4 text-sm text-destructive">
        Couldn't load this exercise. Try refreshing.
      </p>
    )
  }

  const canEdit = canEditTemplate(template, currentUser)

  const libraryHref = `/practitioner/library/${row.exerciseId}?returnTo=${encodeURIComponent(
    `${location.pathname}${location.search}`,
  )}`

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <div>
        <h1 className="text-xl font-semibold">{template.title}</h1>
        <p className="text-sm text-muted-foreground">
          {canEdit ? '- Edit Exercise -' : '- View Exercise -'}
        </p>
      </div>

      {isLoadingExercise ? (
        <p className="text-sm text-muted-foreground">Loading exercise…</p>
      ) : isExerciseError || !exercise ? (
        <p className="text-sm text-destructive">
          Couldn't load this exercise's details.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">{exercise.name}</h2>
            <Button asChild variant="outline" size="sm">
              <Link to={libraryHref}>Find it in Library</Link>
            </Button>
          </div>

          {/* Read-only — see this page's own top comment on why. */}
          <div className="grid gap-4 sm:grid-cols-2">
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

      {/* The per-template prescription, independent of the exercise's
          own definition above — editable only when canEdit. */}
      <div className="divide-y divide-border rounded-lg border px-4">
        <EditableNumberField
          templateId={templateId}
          templateExerciseId={rowId}
          canEdit={canEdit}
          fieldKey="sets"
          label="Sets"
          value={row.sets}
        />
        <EditableNumberField
          templateId={templateId}
          templateExerciseId={rowId}
          canEdit={canEdit}
          fieldKey="reps"
          label="Reps"
          value={row.reps}
        />
        <EditableNumberField
          templateId={templateId}
          templateExerciseId={rowId}
          canEdit={canEdit}
          fieldKey="durationInSeconds"
          label="Duration"
          value={row.durationInSeconds}
          displaySuffix="s"
        />
        <EditableWeightField
          templateId={templateId}
          templateExerciseId={rowId}
          canEdit={canEdit}
          weight={row.weight}
          weightUnit={row.weightUnit}
        />
        <EditableNotesField
          templateId={templateId}
          templateExerciseId={rowId}
          canEdit={canEdit}
          notes={row.notes}
        />
      </div>

      {removeMutation.isError && (
        <p className="text-sm text-destructive">
          Couldn't remove this exercise. Try again.
        </p>
      )}

      <div className="flex items-center gap-4">
        {/* Immediate, no confirmation dialog — matches the exact same
            per-card delete button on the template page's own list;
            removing one exercise from one template is low-stakes,
            unlike archiving the exercise entity itself (which does get
            a confirmation dialog on the Library's own detail page). */}
        {canEdit && (
          <Button
            type="button"
            variant="destructive"
            onClick={() => removeMutation.mutate()}
            disabled={removeMutation.isPending}
          >
            {removeMutation.isPending ? 'Removing…' : 'Remove from Template'}
          </Button>
        )}
        {/* Pure navigation — every field above saves immediately on its
            own, so there's nothing left to submit here. Labeled "Back"
            in read-only mode, where there was nothing to be "done" with. */}
        <Button asChild variant="outline">
          <Link to={returnTo}>{canEdit ? 'Done' : 'Back'}</Link>
        </Button>
      </div>
    </div>
  )
}