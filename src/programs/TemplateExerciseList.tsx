import type { ReactNode } from 'react'
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { computeReorderedIds } from '@/common/reorderIds'
import { sortableAnnouncements } from '@/common/sortableAnnouncements'
import {
  MAX_WORKOUTS,
  groupExercisesByWorkout,
  isWorkoutRemovable,
  nextExercisePosition,
  type WorkoutGroup,
} from '@/workouts/workoutGroups'
import { WorkoutHeader } from '@/workouts/WorkoutHeader'
import { ExerciseWorkoutMenu } from '@/workouts/ExerciseWorkoutMenu'
import {
  TemplateExerciseCard,
  ReadOnlyTemplateExerciseCard,
} from './TemplateExerciseCard'
import { AddTemplateExerciseCard } from './AddTemplateExerciseCard'
import { useTemplateWorkoutEditing } from './useTemplateWorkoutEditing'
import type { TemplateExercise, TemplateWorkout } from './types'

type Group = WorkoutGroup<TemplateWorkout, TemplateExercise>
type Editing = ReturnType<typeof useTemplateWorkoutEditing>

interface TemplateExerciseListProps {
  templateId: number
  // Passed in from the parent's own useProgram() data rather than read
  // here with a second useProgram() call — the parent already has it, and
  // this keeps the list a component that simply renders what it's given.
  workouts: TemplateWorkout[]
  exercises: TemplateExercise[]
  canEdit: boolean
}

// A template's exercises, workout by workout (step 3a-w).
//
// The SHAPE depends on how many workouts there are (decisions §5: "a
// one-workout program shows just its exercises"):
//   - ONE workout — the list as it always was: no header, one Add card,
//     drag to reorder. Plus "Add a workout", which is how a second appears.
//   - SEVERAL — a section per workout ("A · Mobility"), each with its own
//     exercises, its own Add card, and a header to rename it, delete it (when
//     empty) or drag it; each card gets a Move / Copy menu.
//
// Exercises are dragged only WITHIN their workout (each workout's list is its
// own DndContext); moving one to another workout is the menu's job (see
// ExerciseWorkoutMenu for why).
export function TemplateExerciseList({
  templateId,
  workouts,
  exercises,
  canEdit,
}: TemplateExerciseListProps) {
  const groups = groupExercisesByWorkout(workouts, exercises)
  if (!canEdit) {
    return <ReadOnlyWorkouts templateId={templateId} groups={groups} />
  }
  return <EditableWorkouts templateId={templateId} groups={groups} />
}

// --- READ-ONLY -------------------------------------------------------------
//
// Split from the editable view for the rules of hooks: the editable one needs
// mutations and drag sensors, and hooks can't be called conditionally. This
// one needs no hooks at all.

function ReadOnlyWorkouts({ templateId, groups }: { templateId: number; groups: Group[] }) {
  if (groups.length <= 1) {
    const exercises = groups[0]?.exercises ?? []
    if (exercises.length === 0) {
      return <p className="text-sm text-muted-foreground">This template has no exercises.</p>
    }
    return <ReadOnlyCards templateId={templateId} exercises={exercises} />
  }
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.workout.id} aria-label={`Workout ${group.label}`} className="space-y-2">
          <WorkoutHeader position={group.position} name={group.workout.name} label={group.label} />
          {group.exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">No exercises in this workout.</p>
          ) : (
            <ReadOnlyCards templateId={templateId} exercises={group.exercises} />
          )}
        </section>
      ))}
    </div>
  )
}

function ReadOnlyCards({
  templateId,
  exercises,
}: {
  templateId: number
  exercises: TemplateExercise[]
}) {
  return (
    <div className="space-y-2">
      {exercises.map((exercise) => (
        <ReadOnlyTemplateExerciseCard key={exercise.id} templateId={templateId} item={exercise} />
      ))}
    </div>
  )
}

// --- EDITABLE --------------------------------------------------------------

// The drag sensors every sortable list here uses: a mouse / finger (the
// pointer), and the keyboard — Space on a drag handle picks the item up, the
// arrow keys move it, Space drops it, Escape cancels.
// `sortableKeyboardCoordinates` makes the arrows move from slot to slot.
function useSortableSensors() {
  return useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
}

function EditableWorkouts({ templateId, groups }: { templateId: number; groups: Group[] }) {
  const editing = useTemplateWorkoutEditing(templateId)
  const isSeveral = groups.length > 1
  const atLimit = groups.length >= MAX_WORKOUTS

  return (
    <div className="space-y-4">
      {editing.problem && (
        <p role="alert" className="text-sm text-destructive">
          {editing.problem}
        </p>
      )}

      {isSeveral ? (
        <SortableWorkouts templateId={templateId} groups={groups} editing={editing} />
      ) : (
        // One workout: no header, no menu — the list as it always was.
        <WorkoutExercises templateId={templateId} group={groups[0]} groups={groups} editing={editing} />
      )}

      {/* A polite live region, ALWAYS in the page (only its text changes):
          screen readers announce a change of text in a region that already
          exists, while one that appears with its text already inside is
          often missed. It says what a move or copy did — the card has just
          jumped to another workout, maybe off screen. */}
      <p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">
        {editing.notice}
      </p>

      <div className="space-y-1">
        <Button
          type="button"
          variant="outline"
          onClick={() => editing.addWorkout.mutate()}
          disabled={atLimit || editing.isBusy}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {editing.addWorkout.isPending ? 'Adding…' : 'Add a workout'}
        </Button>
        {/* Each sentence explains what the screen can't show on its own. */}
        {atLimit ? (
          <p className="text-xs text-muted-foreground">
            A template can have at most {MAX_WORKOUTS} workouts (A to J).
          </p>
        ) : isSeveral ? (
          <p className="text-xs text-muted-foreground">
            To delete a workout, move or remove its exercises first.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Workouts let different days use different exercises — say upper
            body on Monday, lower body on Wednesday.
          </p>
        )}
      </div>
    </div>
  )
}

// The workouts as a sortable list of sections — each section (header AND its
// exercises) moves as one block. This DndContext only sorts WORKOUTS; each
// section holds its own DndContext for its exercises (WorkoutExercises).
// Two separate contexts keep the two kinds of drag from ever mixing — and
// workout ids and exercise ids are both plain numbers that could collide
// (workout 3 and exercise 3) inside a single one.
function SortableWorkouts({
  templateId,
  groups,
  editing,
}: {
  templateId: number
  groups: Group[]
  editing: Editing
}) {
  const sensors = useSortableSensors()
  const workouts = groups.map((group) => group.workout)

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    const order = computeReorderedIds(workouts, Number(active.id), Number(over.id))
    if (order) editing.reorderWorkouts.mutate(order)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: sortableAnnouncements(
          groups.map((group) => ({ id: group.workout.id, name: `Workout ${group.label}` })),
        ),
      }}
    >
      <SortableContext items={workouts.map((workout) => workout.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-6">
          {groups.map((group) => (
            <SortableWorkoutSection
              key={group.workout.id}
              templateId={templateId}
              group={group}
              groups={groups}
              editing={editing}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableWorkoutSection({
  templateId,
  group,
  groups,
  editing,
}: {
  templateId: number
  group: Group
  groups: Group[]
  editing: Editing
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.workout.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const removable = isWorkoutRemovable({
    workoutCount: groups.length,
    exerciseCount: group.exercises.length,
  })

  return (
    <section
      ref={setNodeRef}
      style={style}
      aria-label={`Workout ${group.label}`}
      className="space-y-2 rounded-lg bg-background"
    >
      <WorkoutHeader
        position={group.position}
        name={group.workout.name}
        label={group.label}
        // The handle, not the whole section, carries the drag listeners — so
        // the cards' links, buttons and their own handles inside the section
        // keep working.
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder workout ${group.label}`}
            className="cursor-grab rounded p-1 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        }
        onRename={(name) => editing.renameWorkout(group.workout.id, name)}
        onDelete={removable ? () => editing.removeWorkout.mutate(group.workout.id) : undefined}
        disabled={editing.isBusy}
      />
      <WorkoutExercises templateId={templateId} group={group} groups={groups} editing={editing} />
    </section>
  )
}

// One workout's exercises: sortable among themselves only, then the Add
// card. Used for the single workout of a one-workout template too (then
// without workout labels or menus).
function WorkoutExercises({
  templateId,
  group,
  groups,
  editing,
}: {
  templateId: number
  group: Group
  groups: Group[]
  editing: Editing
}) {
  const sensors = useSortableSensors()
  const isSeveral = groups.length > 1
  const workoutId = group.workout.id

  // Reached only by a real drag, which jsdom can't perform (dnd-kit measures
  // layout): the order rule is tested in reorderIds.test.ts, the request and
  // the on-screen guess in useTemplateWorkoutEditing.test.tsx, and THIS
  // wiring — the dragged workout's own id and exercises — in Chromium (the
  // backend refuses an order that isn't exactly that workout's exercises).
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    const order = computeReorderedIds(group.exercises, Number(active.id), Number(over.id))
    if (order) editing.reorderExercises.mutate({ workoutId, order })
  }

  const addCard = (
    <AddTemplateExerciseCard
      templateId={templateId}
      workoutId={isSeveral ? workoutId : undefined}
      workoutLabel={isSeveral ? group.label : undefined}
    />
  )

  // Empty: the Add card alone, FIRST — nothing to sort, no DndContext.
  if (group.exercises.length === 0) return addCard

  // The other workouts, for the menu: where this one's exercises can go.
  const targets = groups
    .filter((other) => other.workout.id !== workoutId)
    .map((other) => ({ id: other.workout.id, label: other.label }))

  function menuFor(exercise: TemplateExercise): ReactNode {
    if (!isSeveral) return undefined
    const name = exercise.exercise?.name ?? 'Unknown exercise'
    return (
      <ExerciseWorkoutMenu
        triggerLabel={`More actions for ${name} in workout ${group.label}`}
        targets={targets}
        disabled={editing.isBusy}
        onMove={(target) =>
          editing.moveExercise.mutate({
            exerciseRowId: exercise.id,
            workoutId: target.id,
            name,
            targetLabel: target.label,
          })
        }
        onCopy={(target) =>
          editing.copyExercise.mutate({
            source: exercise,
            workoutId: target.id,
            // The end of the TARGET workout, from the template on screen.
            sortOrder: nextExercisePosition(
              groups.flatMap((other) => other.exercises),
              target.id,
            ),
            name,
            targetLabel: target.label,
          })
        }
      />
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements: sortableAnnouncements(
          group.exercises.map((exercise) => ({
            id: exercise.id,
            name: exercise.exercise?.name ?? 'Unknown exercise',
          })),
        ),
      }}
    >
      <SortableContext
        items={group.exercises.map((exercise) => exercise.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {group.exercises.map((exercise) => (
            <TemplateExerciseCard
              key={exercise.id}
              templateId={templateId}
              item={exercise}
              workoutLabel={isSeveral ? group.label : undefined}
              menu={menuFor(exercise)}
              onDelete={() => editing.removeExercise.mutate(exercise.id)}
              deleting={editing.removeExercise.isPending && editing.removeExercise.variables === exercise.id}
            />
          ))}
          {/* LAST once the workout has exercises — outside the sortable
              items, so it's never treated as a draggable row itself. */}
          {addCard}
        </div>
      </SortableContext>
    </DndContext>
  )
}