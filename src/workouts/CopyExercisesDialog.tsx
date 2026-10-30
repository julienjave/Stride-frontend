import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  canAddWorkout,
  copySubject,
  defaultCopyTarget,
  newWorkoutLabel,
  type CopyTarget,
} from './copyExercises'
import { WORKOUT_NAME_MAX_LENGTH, type ExerciseLike, type WorkoutGroup, type WorkoutLike } from './workoutGroups'
import type { CopyRequest } from './useWorkoutEditing'

interface CopyExercisesDialogProps<W extends WorkoutLike, E extends ExerciseLike> {
  // The workout whose exercises are offered, and every workout (the
  // targets are the others, plus a new one).
  source: WorkoutGroup<W, E>
  groups: WorkoutGroup<W, E>[]
  exerciseName: (exercise: E) => string
  open: boolean
  onOpenChange: (open: boolean) => void
  // Sends the copy (the editor's mutation). The dialog closes at once: the
  // result — "Copied 3 exercises to B." or what went wrong — is said in the
  // editor's message area, where every editing action reports.
  onCopy: (request: CopyRequest) => void
}

// "Copy exercises" (roadmap Phase 6.5; decided with the person 2026-10-29:
// the workout's menu, its exercises ticked, a target workout or a new one).
// Several exercises — or the whole workout — in ONE request: one
// transaction and one audit entry, never a half-copied workout.
//
// Native inputs in <fieldset>s with <legend>s, like the care team's dialog:
// checkboxes (any number) for WHAT, radio buttons (exactly one) for WHERE —
// the browser gives both their keyboard behaviour and their spoken roles.
//
// The dialog is unmounted while closed (Radix renders nothing), so each
// opening starts again from the defaults: every exercise ticked, the next
// workout chosen — no reset code.
export function CopyExercisesDialog<W extends WorkoutLike, E extends ExerciseLike>({
  source,
  groups,
  exerciseName,
  open,
  onOpenChange,
  onCopy,
}: CopyExercisesDialogProps<W, E>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <CopyForm
            source={source}
            groups={groups}
            exerciseName={exerciseName}
            onCopy={(request) => {
              onCopy(request)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CopyForm<W extends WorkoutLike, E extends ExerciseLike>({
  source,
  groups,
  exerciseName,
  onCopy,
}: Pick<CopyExercisesDialogProps<W, E>, 'source' | 'groups' | 'exerciseName' | 'onCopy'>) {
  const idPrefix = useId()
  const fieldId = (name: string) => `${idPrefix}-${name}`
  // Every exercise ticked: "copy the whole workout" is the common case; a
  // few unticks make it "these ones".
  const [chosen, setChosen] = useState<number[]>(() => source.exercises.map((e) => e.id))
  // A new workout is the default only when there is no other workout — and
  // then the limit (10) can't have been reached.
  const [target, setTarget] = useState<number | 'new'>(() => defaultCopyTarget(source, groups))
  const [newName, setNewName] = useState('')

  const others = groups.filter((group) => group.workout.id !== source.workout.id)
  const newAllowed = canAddWorkout(groups.length)
  const count = chosen.length
  // Sendable: something ticked, and a target that exists (a new workout
  // only while one may be added).
  const ready = count > 0 && (target !== 'new' || newAllowed)

  function toggle(id: number) {
    setChosen((current) =>
      current.includes(id) ? current.filter((other) => other !== id) : [...current, id],
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    // In the SOURCE's order, whatever order the boxes were ticked in (the
    // backend orders them too — this keeps the request readable).
    const exerciseIds = source.exercises.map((e) => e.id).filter((id) => chosen.includes(id))
    const onlyName = exerciseName(source.exercises.find((e) => e.id === exerciseIds[0])!)
    const copyTarget: CopyTarget =
      target === 'new' ? { newWorkoutName: newName } : { workoutId: target }
    const targetLabel =
      target === 'new'
        ? `a new workout, ${newWorkoutLabel(groups.length, newName.trim() || null)}`
        : others.find((group) => group.workout.id === target)!.label
    onCopy({
      exerciseIds,
      target: copyTarget,
      subject: copySubject(exerciseIds.length, onlyName),
      targetLabel,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <DialogHeader>
        <DialogTitle>Copy exercises from {source.label}</DialogTitle>
        <DialogDescription>
          The copies are added at the end of the workout you choose. They're independent: changing
          one won't change its original.
        </DialogDescription>
      </DialogHeader>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Exercises to copy</legend>
        <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border">
          {source.exercises.map((exercise) => (
            <li key={exercise.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={chosen.includes(exercise.id)}
                  onChange={() => toggle(exercise.id)}
                />
                <span className="min-w-0 wrap-break-word">{exerciseName(exercise)}</span>
              </label>
            </li>
          ))}
        </ul>
        {count === 0 && (
          <p className="text-sm text-muted-foreground">Tick at least one exercise to copy.</p>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Copy to</legend>
        {others.map((group) => (
          <label key={group.workout.id} className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="radio"
              name={fieldId('target')}
              checked={target === group.workout.id}
              onChange={() => setTarget(group.workout.id)}
            />
            Workout {group.label}
          </label>
        ))}
        <label
          className={
            newAllowed
              ? 'flex cursor-pointer items-center gap-3 text-sm'
              : 'flex items-center gap-3 text-sm opacity-60'
          }
        >
          <input
            type="radio"
            name={fieldId('target')}
            checked={target === 'new'}
            onChange={() => setTarget('new')}
            disabled={!newAllowed}
          />
          A new workout ({newWorkoutLabel(groups.length, null)})
        </label>
        {!newAllowed && (
          <p className="text-xs text-muted-foreground">
            There are already 10 workouts (A to J): copy into one of them.
          </p>
        )}
        {target === 'new' && newAllowed && (
          <div className="space-y-1 pl-7">
            <Label htmlFor={fieldId('name')}>Name of the new workout (optional)</Label>
            <Input
              id={fieldId('name')}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={WORKOUT_NAME_MAX_LENGTH}
              placeholder="No name"
            />
          </div>
        )}
      </fieldset>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit" disabled={!ready}>
          {count === 1 ? 'Copy 1 exercise' : `Copy ${count} exercises`}
        </Button>
      </DialogFooter>
    </form>
  )
}