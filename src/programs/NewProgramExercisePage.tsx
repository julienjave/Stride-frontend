import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
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

  if (!id || Number.isNaN(templateId)) {
    return <p className="text-sm text-destructive">Invalid template.</p>
  }

  return <NewTemplateExercise templateId={templateId} />
}

function NewTemplateExercise({ templateId }: { templateId: number }) {
  const queryClient = useQueryClient()
  const { data: template } = useProgram(templateId)

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

  return (
    <NewWorkoutExerciseView
      noun="template"
      resource={template}
      resourcePath={`/practitioner/programs/templates/${templateId}`}
      add={add}
    />
  )
}