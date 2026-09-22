import { useParams, Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { useProgram } from './useProgram'
import {
  programQueryKey,
  reorderTemplateExercises,
  removeTemplateExercise,
} from './api'
import { TemplateExerciseCard } from './TemplateExerciseCard'
import { AddTemplateExerciseCard } from './AddTemplateExerciseCard'
import { computeReorderedTemplateExerciseIds } from './templateExerciseReorder'
import type { ProgramTemplateDetail } from './types'

// Screen 2 of the template creation flow — also a stable, reusable route
// for editing an existing template's exercise list later (see this
// file's own placeholder-era comment, and ExercisePhotosPage for the
// exact same architecture applied to exercise photos: immediate
// reorder/remove with optimistic updates, "Done" is pure navigation
// since nothing here is ever staged).
export function TemplateExercisesPage() {
  const { id } = useParams<{ id: string }>()
  const templateId = Number(id)

  if (!id || Number.isNaN(templateId)) {
    return <p className="text-sm text-destructive">Invalid template.</p>
  }

  return <TemplateExercisesView templateId={templateId} />
}

function TemplateExercisesView({ templateId }: { templateId: number }) {
  const queryClient = useQueryClient()
  const { data: template, isLoading, isError } = useProgram(templateId)

  const removeMutation = useMutation({
    mutationFn: (templateExerciseId: number) =>
      removeTemplateExercise(templateId, templateExerciseId),
    onSuccess: (updated) => {
      queryClient.setQueryData(programQueryKey(templateId), updated)
    },
  })

  // Same optimistic-update shape as ExercisePhotosPage's reorderMutation
  // — updates the cache immediately (before the request even resolves)
  // so dragging feels instant, rolls back to the exact previous state on
  // failure, and lets the server's real response win on success.
  const reorderMutation = useMutation({
    mutationFn: (order: number[]) =>
      reorderTemplateExercises(templateId, order),
    onMutate: async (order) => {
      await queryClient.cancelQueries({
        queryKey: programQueryKey(templateId),
      })
      const previous = queryClient.getQueryData<ProgramTemplateDetail>(
        programQueryKey(templateId),
      )
      if (previous) {
        const byId = new Map(
          previous.exercises.map((exercise) => [exercise.id, exercise]),
        )
        const reordered = order
          .map((rowId) => byId.get(rowId))
          .filter(
            (exercise): exercise is ProgramTemplateDetail['exercises'][number] =>
              exercise != null,
          )
        queryClient.setQueryData(programQueryKey(templateId), {
          ...previous,
          exercises: reordered,
        })
      }
      return { previous }
    },
    onError: (_error, _order, context) => {
      if (context?.previous) {
        queryClient.setQueryData(programQueryKey(templateId), context.previous)
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(programQueryKey(templateId), updated)
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || !template) return
    const newOrder = computeReorderedTemplateExerciseIds(
      template.exercises,
      Number(active.id),
      Number(over.id),
    )
    if (newOrder) {
      reorderMutation.mutate(newOrder)
    }
  }

  if (isLoading) {
    return (
      <p className="mx-auto mt-12 max-w-2xl px-4 text-sm text-muted-foreground">
        Loading…
      </p>
    )
  }

  if (isError || !template) {
    return (
      <p className="mx-auto mt-12 max-w-2xl px-4 text-sm text-destructive">
        Couldn't load this template. Try refreshing.
      </p>
    )
  }

  const hasExercises = template.exercises.length > 0
  const addCard = <AddTemplateExerciseCard templateId={templateId} />

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      <h1 className="text-xl font-semibold">{template.title}</h1>

      {removeMutation.isError && (
        <p className="text-sm text-destructive">
          Couldn't remove that exercise. Try again.
        </p>
      )}

      {!hasExercises ? (
        // Add card comes FIRST when the template is empty — nothing
        // else to reorder, so no DndContext needed at all here.
        <div className="space-y-2">{addCard}</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={template.exercises.map((exercise) => exercise.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {template.exercises.map((exercise) => (
                <TemplateExerciseCard
                  key={exercise.id}
                  templateId={templateId}
                  item={exercise}
                  onDelete={() => removeMutation.mutate(exercise.id)}
                  deleting={
                    removeMutation.isPending &&
                    removeMutation.variables === exercise.id
                  }
                />
              ))}
              {/* Add card comes LAST once the template has exercises —
                  deliberately different from the exercise Library's own
                  AddExerciseCard (always first), per the design
                  discussion. Outside the SortableContext's items list, so
                  it's never treated as a draggable row itself. */}
              {addCard}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Pure navigation — nothing to submit. Every real change (reorder,
          remove) already happened immediately, same reasoning as
          ExercisePhotosPage's own Done button. */}
      <Button asChild>
        <Link to={`/practitioner/programs/templates/${templateId}`}>Done</Link>
      </Button>
    </div>
  )
}