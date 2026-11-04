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

import { Link, useLocation, useParams, useSearchParams, useNavigate } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { LoadError } from '@/common/LoadError'
import { RecordLoadFailed, RecordNotFound } from '@/common/RecordNotFound'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useExercise } from '@/exercises/useExercise'
import { localPath } from '@/exercises/pickerReturnHref'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'
import { useProgram } from './useProgram'
import { canEditTemplate } from './permissions'
import { removeTemplateExercise, programQueryKey, updateTemplateExercise } from './api'
import { EditableNumberField } from './EditableNumberField'
import { EditableWeightField } from './EditableWeightField'
import { EditableNotesField } from './EditableNotesField'
import { ExercisePhotoCarousel } from './ExercisePhotoCarousel'
import { Loading } from '@/common/Loading'

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

  // Ids that aren't numbers can't name a template, or an exercise in one:
  // the same pages as a 404 (RecordNotFound), without asking the server.
  if (!id || Number.isNaN(templateId)) {
    return <RecordNotFound noun="template" links={PROGRAMS_LINK} />
  }
  if (!templateExerciseId || Number.isNaN(rowId)) {
    return <RecordNotFound noun="exercise" links={exerciseWaysOut(templateId)} />
  }

  return <ProgramExerciseView templateId={templateId} rowId={rowId} />
}

// Where to go when this page can't show its exercise: the template's page
// (when there is a template), and the Programs hub.
const PROGRAMS_LINK: [{ to: string; label: string }] = [
  { to: '/practitioner/programs', label: 'Programs' },
]

function exerciseWaysOut(templateId: number): [{ to: string; label: string }, { to: string; label: string }] {
  return [
    { to: `/practitioner/programs/templates/${templateId}`, label: 'Back to the template' },
    ...PROGRAMS_LINK,
  ]
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
  //
  // Through localPath (step 3b-1b): `returnTo` comes from the address bar,
  // so anyone can write a link with returnTo=https://elsewhere.example —
  // and Done / Remove would send the practitioner to another site (an
  // "open redirect"). localPath keeps only the path, on this site (see
  // pickerReturnHref.ts, where the picker got the same fix in 3a-w).
  const returnTo = localPath(
    searchParams.get('returnTo') ?? `/practitioner/programs/templates/${templateId}`,
  )

  const templateQuery = useProgram(templateId)
  const { data: template, isLoading } = templateQuery
  const { data: currentUser } = useCurrentUser()
  const row = template?.exercises.find((exercise) => exercise.id === rowId)

  // Only fetch once the row (and therefore its exerciseId) is known —
  // same enabled pattern as NewProgramExercisePage.
  const exerciseQuery = useExercise(row?.exerciseId ?? -1, row != null)
  const { data: exercise, isLoading: isLoadingExercise } = exerciseQuery

  // After a "Try again" that worked, focus goes to the heading of what came
  // back: the page's title (the template), or — when only the library
  // exercise's details had failed — the exercise's name above them.
  const heading = useRetryFocus<HTMLHeadingElement>('this exercise', templateQuery.isSuccess)
  const detailsHeading = useRetryFocus<HTMLHeadingElement>(
    "this exercise's details",
    exerciseQuery.isSuccess,
  )

  // What saving one prescription field means HERE: PATCH the template's row,
  // then put the template the server answers with into its cache entry —
  // the template page and this one both read it. Handed to each field as
  // its `save` (the fields themselves are shared with the program's
  // exercise page, which saves to a program instead).
  async function save(changes: PrescriptionChanges) {
    const updated = await updateTemplateExercise(templateId, rowId, changes)
    queryClient.setQueryData(programQueryKey(templateId), updated)
  }

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
    return <Loading className="mx-auto mt-12 max-w-2xl px-4" />
  }

  // The template's read failed: a 404 → "Template not found"; anything
  // else → the load error and "Try again".
  if (templateQuery.isError || !template) {
    return (
      <RecordLoadFailed queries={[templateQuery]} what="this exercise" noun="template" links={PROGRAMS_LINK} />
    )
  }

  // The template is there, but this exercise isn't in it (removed since the
  // link was made, or an id from elsewhere): asking again can't bring it back.
  if (!row) {
    return <RecordNotFound noun="exercise" links={exerciseWaysOut(templateId)} />
  }

  const canEdit = canEditTemplate(template, currentUser)

  const libraryHref = `/practitioner/library/${row.exerciseId}?returnTo=${encodeURIComponent(
    `${location.pathname}${location.search}`,
  )}`

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <div>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {template.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {canEdit ? '- Edit Exercise -' : '- View Exercise -'}
        </p>
      </div>

      {isLoadingExercise ? (
        <Loading label="Loading the exercise…" />
      ) : exerciseQuery.isError || !exercise ? (
        <LoadError what="this exercise's details" queries={[exerciseQuery]} />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 ref={detailsHeading} tabIndex={-1} className="text-lg font-medium outline-none">
              {exercise.name}
            </h2>
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
          save={save}
          canEdit={canEdit}
          fieldKey="sets"
          label="Sets"
          value={row.sets}
        />
        <EditableNumberField
          save={save}
          canEdit={canEdit}
          fieldKey="reps"
          label="Reps"
          value={row.reps}
        />
        <EditableNumberField
          save={save}
          canEdit={canEdit}
          fieldKey="durationInSeconds"
          label="Duration"
          value={row.durationInSeconds}
          displaySuffix="s"
        />
        <EditableWeightField
          save={save}
          canEdit={canEdit}
          weight={row.weight}
          weightUnit={row.weightUnit}
        />
        <EditableNotesField
          save={save}
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