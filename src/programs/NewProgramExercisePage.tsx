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

import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { RecordLoadFailed, RecordNotFound } from '@/common/RecordNotFound'
import { useRetryFocus } from '@/common/useRetryFocus'
import { NewWorkoutExerciseView } from '@/workouts/NewWorkoutExerciseView'
import { useProgram } from './useProgram'
import { addTemplateExercise, programQueryKey } from './api'
import type { AddTemplateExerciseFormValues } from './schemas'

// Screen filled in from the "Add New Exercise" card on TemplateDetailPage's
// exercise list: `/practitioner/programs/templates/:id/exercises/new`
// (optionally `?workoutId=58`, and `&exerciseId=9` once one is picked).
//
// Since step 3b-1b the page itself — the picker round trip, the workout in
// the address, the prescription form — is NewWorkoutExerciseView
// (src/workouts/), shared with the assigned program's add page. What stays
// here is what makes it a TEMPLATE's: which template, and what adding means
// (the template route, then the template's cache entry).
export function NewProgramExercisePage() {
  const { id } = useParams<{ id: string }>()
  const templateId = Number(id)

  // (An id that isn't a number can't be a template: the 404's page.)
  if (!id || Number.isNaN(templateId)) {
    return <RecordNotFound noun="template" links={WAYS_OUT} />
  }

  return <NewTemplateExercise templateId={templateId} />
}

// Where to go when this page can't show its template (RecordNotFound).
const WAYS_OUT: [{ to: string; label: string }] = [
  { to: '/practitioner/programs', label: 'Programs' },
]

function NewTemplateExercise({ templateId }: { templateId: number }) {
  const queryClient = useQueryClient()
  const templateQuery = useProgram(templateId)
  const { data: template } = templateQuery
  // After a "Try again" that worked, focus goes to the template's title.
  const heading = useRetryFocus<HTMLHeadingElement>('this template', templateQuery.isSuccess)

  // The request, then the answer — the whole template — into its cache
  // entry, so the template page shows the new card at once.
  async function add(
    exerciseId: number,
    values: AddTemplateExerciseFormValues,
    workoutId: number | null,
  ) {
    const updated = await addTemplateExercise(templateId, exerciseId, values, workoutId)
    queryClient.setQueryData(programQueryKey(templateId), updated)
  }

  // The template's read failed (2026-10-28 — before, the page waited on
  // "…" for ever): a 404 → "Template not found", else the load error.
  if (templateQuery.isError) {
    return (
      <RecordLoadFailed queries={[templateQuery]} what="this template" noun="template" links={WAYS_OUT} />
    )
  }

  return (
    <NewWorkoutExerciseView
      noun="template"
      resource={template}
      resourcePath={`/practitioner/programs/templates/${templateId}`}
      add={add}
      headingRef={heading}
    />
  )
}