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

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
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
import { Copy, GripVertical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { computeReorderedIds } from '@/common/reorderIds'
import { sortableAnnouncements } from '@/common/sortableAnnouncements'
import { WorkoutHeader } from './WorkoutHeader'
import { ExerciseWorkoutMenu } from './ExerciseWorkoutMenu'
import { CopyExercisesDialog } from './CopyExercisesDialog'
import {
  MAX_WORKOUTS,
  type ExerciseLike,
  type WorkoutGroup,
  type WorkoutLike,
} from './workoutGroups'
import type { WorkoutEditing } from './useWorkoutEditing'

// What a card needs from the list around it.
export interface CardSlots {
  // The card's workout ("A · Mobility") when there are several — for its
  // buttons' accessible names ("Remove Squat from workout A · Mobility"): a
  // copied warm-up puts the same exercise in two workouts. Absent with one.
  workoutLabel?: string
  // The Move / Copy menu, when there's another workout to move or copy to.
  menu?: ReactNode
}

interface WorkoutListEditorProps<W extends WorkoutLike, E extends ExerciseLike> {
  groups: WorkoutGroup<W, E>[]
  editing: WorkoutEditing
  // An exercise's name, for the menus, the messages and the drag
  // announcements — a template exercise carries it on its library
  // exercise, a program exercise on its own copy.
  exerciseName: (exercise: E) => string
  // One SORTABLE card (it must call useSortable with the exercise's id —
  // see TemplateExerciseCard): the resource decides what a card shows and
  // what removing it means (at once for a template; behind a dialog that
  // asks the backend first for a program).
  renderCard: (exercise: E, slots: CardSlots) => ReactNode
  // A workout's "Add New Exercise" card. `several`: whether the resource
  // has more than one workout (with one, the card names no workout).
  renderAddCard: (group: WorkoutGroup<W, E>, several: boolean) => ReactNode
  // Whether a workout may be deleted — the caller's rule (a template knows
  // less than a program: no sessions, no schedule). Delete is offered only
  // when this says yes.
  canDeleteWorkout: (group: WorkoutGroup<W, E>) => boolean
  // An optional line under a workout's header, saying what the screen
  // can't show on its own (e.g. why an empty workout has no Delete).
  workoutNote?: (group: WorkoutGroup<W, E>) => string | null
  // The sentence under "Add a workout" when there are several.
  deleteHint: string
}

// A resource's exercises, workout by workout, editable: the list built for
// templates in step 3a-w, lifted out of the template page in 3b-1 so the
// program page uses the same one. What differs between the two — the card,
// the Add card, the delete rule — arrives as props; the shape and the
// dragging are shared.
//
// The SHAPE depends on how many workouts there are (decisions §5: "a
// one-workout program shows just its exercises"):
//   - ONE workout — the list as it always was: no header, one Add card,
//     drag to reorder. Plus "Add a workout", which is how a second appears.
//   - SEVERAL — a section per workout ("A · Mobility"), each with its own
//     exercises, its own Add card, and a header to rename it, delete it (when
//     it may be) or drag it; each card gets a Move / Copy menu.
//
// Exercises are dragged only WITHIN their workout (each workout's list is its
// own DndContext); moving one to another workout is the menu's job (see
// ExerciseWorkoutMenu for why).
export function WorkoutListEditor<W extends WorkoutLike, E extends ExerciseLike>(
  props: WorkoutListEditorProps<W, E>,
) {
  const { groups, editing, deleteHint } = props
  const isSeveral = groups.length > 1
  const atLimit = groups.length >= MAX_WORKOUTS
  const container = useRef<HTMLDivElement>(null)
  // The workout whose "Copy exercises" dialog is open (roadmap Phase 6.5),
  // or null. One dialog for the whole editor, opened from a workout's
  // header — or, with ONE workout (no header), from the button beside "Add
  // a workout".
  const [copyFromId, setCopyFromId] = useState<number | null>(null)
  const copySource = groups.find((group) => group.workout.id === copyFromId) ?? null

  // Focus after a removal (focusAfterRemoval): the target was chosen from
  // the server's answer, but the screen may not show that answer yet —
  // TanStack Query tells components about the new data AFTER the mutation's
  // onSuccess, so for a render or two the OLD list is still there (the
  // schedule editor met the same timing, 3a-2). With it, the removed card's
  // open dialog and its focus trap, which would pull focus straight back
  // (a program's Remove asks in a dialog). So focus moves only once the
  // REMOVED card has left the screen, and the target element exists — then
  // focusMoved() says so, so it happens once. Runs after every render where
  // the target or the list changed. The Remove buttons carry
  // `data-remove-exercise` (each card sets it); the Add card is found inside
  // the wrapper this list puts around it.
  const { focusTarget, focusMoved } = editing
  useEffect(() => {
    if (!focusTarget) return
    const root = container.current
    if (!root || root.querySelector(`[data-remove-exercise="${focusTarget.removedId}"]`)) return
    const selector =
      focusTarget.kind === 'remove'
        ? `[data-remove-exercise="${focusTarget.exerciseRowId}"]`
        : `[data-add-exercise-workout="${focusTarget.workoutId}"] a`
    const element = root.querySelector<HTMLElement>(selector)
    if (element) {
      element.focus()
      focusMoved()
    }
  }, [focusTarget, focusMoved, groups])

  return (
    <div ref={container} className="space-y-4">
      {editing.problem && (
        <p role="alert" className="text-sm text-destructive">
          {editing.problem}
        </p>
      )}

      {isSeveral ? (
        <SortableWorkouts {...props} onCopyFrom={setCopyFromId} />
      ) : (
        // One workout: no header, no menu — the list as it always was.
        <WorkoutExercises {...props} group={groups[0]} />
      )}

      {/* What a move, copy or removal did is a snackbar now (decisions §33,
          raised by useWorkoutEditing) — no message area of its own here. */}

      {copySource && (
        <CopyExercisesDialog
          source={copySource}
          groups={groups}
          exerciseName={props.exerciseName}
          open
          onOpenChange={(open) => {
            if (!open) setCopyFromId(null)
          }}
          onCopy={(request) => editing.copyExercises.mutate(request)}
        />
      )}

      <div className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => editing.addWorkout.mutate()}
            disabled={atLimit || editing.isBusy}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {editing.addWorkout.isPending ? 'Adding…' : 'Add a workout'}
          </Button>
          {/* With ONE workout there's no header to hold the Copy button:
              copying it means a new workout — "duplicate the workout",
              then change the copy. */}
          {!isSeveral && groups[0].exercises.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCopyFromId(groups[0].workout.id)}
              disabled={atLimit || editing.isBusy}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy to a new workout…
            </Button>
          )}
        </div>
        {/* Each sentence explains what the screen can't show on its own. */}
        {atLimit ? (
          <p className="text-xs text-muted-foreground">
            A {editing.noun} can have at most {MAX_WORKOUTS} workouts (A to J).
          </p>
        ) : isSeveral ? (
          <p className="text-xs text-muted-foreground">{deleteHint}</p>
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

// The workouts as a sortable list of sections — each section (header AND its
// exercises) moves as one block. This DndContext only sorts WORKOUTS; each
// section holds its own DndContext for its exercises (WorkoutExercises).
// Two separate contexts keep the two kinds of drag from ever mixing — and
// workout ids and exercise ids are both plain numbers that could collide
// (workout 3 and exercise 3) inside a single one.
function SortableWorkouts<W extends WorkoutLike, E extends ExerciseLike>(
  props: WorkoutListEditorProps<W, E> & { onCopyFrom: (workoutId: number) => void },
) {
  const { groups, editing } = props
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
            <SortableWorkoutSection key={group.workout.id} {...props} group={group} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableWorkoutSection<W extends WorkoutLike, E extends ExerciseLike>(
  props: WorkoutListEditorProps<W, E> & {
    group: WorkoutGroup<W, E>
    onCopyFrom: (workoutId: number) => void
  },
) {
  const { group, editing, canDeleteWorkout, workoutNote, onCopyFrom } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.workout.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  const note = workoutNote?.(group) ?? null

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
        onDelete={canDeleteWorkout(group) ? () => editing.removeWorkout.mutate(group.workout.id) : undefined}
        // Only a workout with something to copy offers it.
        onCopy={group.exercises.length > 0 ? () => onCopyFrom(group.workout.id) : undefined}
        disabled={editing.isBusy}
      />
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      <WorkoutExercises {...props} />
    </section>
  )
}

// One workout's exercises: sortable among themselves only, then the Add
// card. Used for the single workout of a one-workout resource too (then
// without workout labels or menus).
function WorkoutExercises<W extends WorkoutLike, E extends ExerciseLike>({
  group,
  groups,
  editing,
  exerciseName,
  renderCard,
  renderAddCard,
}: WorkoutListEditorProps<W, E> & { group: WorkoutGroup<W, E> }) {
  const sensors = useSortableSensors()
  const isSeveral = groups.length > 1
  const workoutId = group.workout.id

  // Reached only by a real drag, which jsdom can't perform (dnd-kit measures
  // layout): the order rule is tested in reorderIds.test.ts, the request and
  // the on-screen guess in the editing hooks' tests, and THIS wiring — the
  // dragged workout's own id and exercises — in Chromium (the backend
  // refuses an order that isn't exactly that workout's exercises).
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    const order = computeReorderedIds(group.exercises, Number(active.id), Number(over.id))
    if (order) editing.reorderExercises.mutate({ workoutId, order })
  }

  // Wrapped, and marked with its workout, so focus can be put on it after
  // the workout's last exercise is removed (the card itself only knows its
  // workout when there are several).
  const addCard = (
    <div data-add-exercise-workout={workoutId}>{renderAddCard(group, isSeveral)}</div>
  )

  // Empty: the Add card alone, FIRST — nothing to sort, no DndContext.
  if (group.exercises.length === 0) return addCard

  // The other workouts, for the menu: where this one's exercises can go.
  const targets = groups
    .filter((other) => other.workout.id !== workoutId)
    .map((other) => ({ id: other.workout.id, label: other.label }))

  function menuFor(exercise: E): ReactNode {
    if (!isSeveral) return undefined
    const name = exerciseName(exercise)
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
        // One exercise, through the same route as the dialog's several: the
        // backend copies the row and appends it (roadmap Phase 6.5).
        onCopy={(target) =>
          editing.copyExercises.mutate({
            exerciseIds: [exercise.id],
            target: { workoutId: target.id },
            subject: name,
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
          group.exercises.map((exercise) => ({ id: exercise.id, name: exerciseName(exercise) })),
        ),
      }}
    >
      <SortableContext
        items={group.exercises.map((exercise) => exercise.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {group.exercises.map((exercise) => (
            // A fragment with the key: `renderCard` returns any node, and
            // React needs the key on what the map returns.
            <Fragment key={exercise.id}>
              {renderCard(exercise, {
                workoutLabel: isSeveral ? group.label : undefined,
                menu: menuFor(exercise),
              })}
            </Fragment>
          ))}
          {/* LAST once the workout has exercises — outside the sortable
              items, so it's never treated as a draggable row itself. */}
          {addCard}
        </div>
      </SortableContext>
    </DndContext>
  )
}