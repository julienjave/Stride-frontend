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
import {
  programQueryKey,
  reorderTemplateExercises,
  removeTemplateExercise,
} from './api'
import {
  TemplateExerciseCard,
  ReadOnlyTemplateExerciseCard,
} from './TemplateExerciseCard'
import { AddTemplateExerciseCard } from './AddTemplateExerciseCard'
import { computeReorderedTemplateExerciseIds } from './templateExerciseReorder'
import type { ProgramTemplateDetail, TemplateExercise } from './types'

interface TemplateExerciseListProps {
  templateId: number
  // Passed in from the parent's own useProgram() data rather than read
  // here with a second useProgram() call — the parent already has it,
  // and this keeps the list a component that simply renders what it's
  // given. (Both would read the same cache entry either way; this just
  // makes the data flow visible in the props.)
  exercises: TemplateExercise[]
  canEdit: boolean
}

// The exercise list that used to BE TemplateExercisesPage, extracted so
// TemplateDetailPage can render it under the template's own
// title/description. The reorder/remove behavior is unchanged — only
// where it lives moved. Its two mutations live here (not on the page)
// because this component is what triggers them: keeping a mutation next
// to the UI that fires it means the page doesn't have to know how
// reordering works at all.
//
// Both mutations write the server's response into programQueryKey —
// the same cache entry the page's title/description editors write to.
// That's safe precisely because every one of those endpoints returns the
// same full enriched template shape: whichever write lands last, the
// entry is always a complete template, never a partial one.
export function TemplateExerciseList({
  templateId,
  exercises,
  canEdit,
}: TemplateExerciseListProps) {
  if (!canEdit) {
    return <ReadOnlyExerciseList templateId={templateId} exercises={exercises} />
  }
  return <EditableExerciseList templateId={templateId} exercises={exercises} />
}

// Split into two inner components for the same rules-of-hooks reason as
// the two card components: the editable list needs useMutation/
// useSensors hooks the read-only list has no use for, and hooks can't
// be called conditionally. The read-only one needs no hooks at all.
function ReadOnlyExerciseList({
  templateId,
  exercises,
}: {
  templateId: number
  exercises: TemplateExercise[]
}) {
  if (exercises.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This template has no exercises.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      {exercises.map((exercise) => (
        <ReadOnlyTemplateExerciseCard
          key={exercise.id}
          templateId={templateId}
          item={exercise}
        />
      ))}
    </div>
  )
}

function EditableExerciseList({
  templateId,
  exercises,
}: {
  templateId: number
  exercises: TemplateExercise[]
}) {
  const queryClient = useQueryClient()

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
            (exercise): exercise is TemplateExercise => exercise != null,
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
    if (!over) return
    const newOrder = computeReorderedTemplateExerciseIds(
      exercises,
      Number(active.id),
      Number(over.id),
    )
    if (newOrder) {
      reorderMutation.mutate(newOrder)
    }
  }

  const addCard = <AddTemplateExerciseCard templateId={templateId} />

  return (
    <div className="space-y-2">
      {removeMutation.isError && (
        <p className="text-sm text-destructive">
          Couldn't remove that exercise. Try again.
        </p>
      )}

      {exercises.length === 0 ? (
        // Add card comes FIRST when the template is empty — nothing
        // else to reorder, so no DndContext needed at all here.
        addCard
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={exercises.map((exercise) => exercise.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {exercises.map((exercise) => (
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
    </div>
  )
}