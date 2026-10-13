import { useState } from 'react'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import {
  applyExerciseOrder,
  applyWorkoutOrder,
  type ExerciseLike,
  type WorkoutLike,
} from './workoutGroups'

// What a failed request says on screen: "<what failed>. <why>".
//
// The backend's 4xx messages are written for people and say what to do
// ("Workout B still has exercises: move or remove them first"), so they're
// shown as they are. A 5xx or a network failure carries nothing useful to
// the practitioner, so it gets "Try again." — the request itself was fine.
export function describeFailure(action: string, error: unknown): string {
  if (error instanceof ApiError && error.statusCode < 500) {
    return `${action}. ${error.messages.join(' ')}`
  }
  return `${action}. Try again.`
}

// What the editor works on: something with workouts and exercises — a
// template, or an assigned program. Every write on either answers with the
// whole thing, in this shape.
export interface WorkoutResource<W extends WorkoutLike, E extends ExerciseLike> {
  workouts: W[]
  exercises: E[]
}

// The requests behind each editing action, for ONE resource. The template
// page passes the template routes, the program page the program routes;
// everything else — the cache work, the guesses, the messages — is the
// same, and lives here once.
export interface WorkoutEditingRoutes<R, E> {
  addWorkout: () => Promise<R>
  removeWorkout: (workoutId: number) => Promise<R>
  renameWorkout: (workoutId: number, name: string | null) => Promise<R>
  reorderWorkouts: (order: number[]) => Promise<R>
  reorderExercises: (workoutId: number, order: number[]) => Promise<R>
  moveExercise: (exerciseRowId: number, workoutId: number) => Promise<R>
  copyExercise: (source: E, workoutId: number, sortOrder: number) => Promise<R>
  removeExercise: (exerciseRowId: number) => Promise<R>
}

// `name` and `targetLabel` travel with the requests only for the messages:
// "Moved Squat to B · Strength." The card the message is about has just
// jumped to another workout — possibly off screen — so the message says
// where it went.
export interface MoveRequest {
  exerciseRowId: number
  workoutId: number
  name: string
  targetLabel: string
}

export interface CopyRequest<E> {
  source: E
  workoutId: number
  sortOrder: number
  name: string
  targetLabel: string
}

export interface RemoveRequest {
  exerciseRowId: number
  name: string
}

interface Options<R> {
  // What to announce after a removal, from the resource as the server
  // answered. None by default (a template's card simply disappears); the
  // program page says whether the exercise was deleted or kept for its
  // sessions (step 3b-1).
  removedNotice?: (updated: R, removal: RemoveRequest) => string | null
  // The resource's noun in messages — "template", "program".
  noun: string
}

// Every write a workout editor makes, in one hook — the requests, the cache
// work, the busy state and the messages. Lifted out of the template page
// (3a-w) for the program page (3b-1): only the routes and the cache key
// differ, so `useTemplateWorkoutEditing` and `useProgramWorkoutEditing` are
// each a few lines handing their own over.
//
// Each write answers with the full resource, which REPLACES the cache entry
// (`setQueryData`): the server's version of the whole thing, never a patched
// guess. Two writes are also shown BEFORE the answer ("optimistic"): the
// drags. A dropped card that jumps back for half a second until the server
// answers feels broken, so the screen moves it at once — and puts back the
// previous state if the server refuses.
//
// One message area for the whole editor, `problem` (role="alert") and
// `notice` (a polite live region): whichever action happened last speaks.
// Starting any action clears both, so an old message never describes a
// newer state.
//
// Generic over R, the resource's own type: TypeScript then knows that
// `setQueryData` writes a template into a template's cache entry and a
// program into a program's — the hook never has to say which.
export function useWorkoutEditing<
  W extends WorkoutLike,
  E extends ExerciseLike,
  R extends WorkoutResource<W, E>,
>(queryKey: QueryKey, routes: WorkoutEditingRoutes<R, E>, options: Options<R>) {
  const queryClient = useQueryClient()
  const [problem, setProblem] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function write(updated: R) {
    queryClient.setQueryData(queryKey, updated)
  }

  function startAction() {
    setProblem(null)
    setNotice(null)
  }

  // The shared shape of an optimistic write: stop any refetch that could
  // overwrite the guess (`cancelQueries`), remember the current resource,
  // write the guess; on failure write the remembered one back.
  async function guess(change: (current: R) => R) {
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData<R>(queryKey)
    if (previous) {
      queryClient.setQueryData(queryKey, change(previous))
    }
    return { previous }
  }

  function restore(context: { previous?: R } | undefined) {
    if (context?.previous) {
      queryClient.setQueryData(queryKey, context.previous)
    }
  }

  const addWorkout = useMutation({
    mutationFn: () => routes.addWorkout(),
    onMutate: startAction,
    onSuccess: write,
    onError: (error) => setProblem(describeFailure("Couldn't add a workout", error)),
  })

  const removeWorkout = useMutation({
    mutationFn: (workoutId: number) => routes.removeWorkout(workoutId),
    onMutate: startAction,
    onSuccess: write,
    onError: (error) => setProblem(describeFailure("Couldn't delete that workout", error)),
  })

  const reorderWorkouts = useMutation({
    mutationFn: (order: number[]) => routes.reorderWorkouts(order),
    onMutate: (order) => {
      startAction()
      return guess((current) => ({
        ...current,
        workouts: applyWorkoutOrder(current.workouts, order),
      }))
    },
    onSuccess: write,
    onError: (error, _order, context) => {
      restore(context)
      setProblem(describeFailure("Couldn't reorder the workouts", error))
    },
  })

  const reorderExercises = useMutation({
    mutationFn: ({ workoutId, order }: { workoutId: number; order: number[] }) =>
      routes.reorderExercises(workoutId, order),
    onMutate: ({ workoutId, order }) => {
      startAction()
      return guess((current) => ({
        ...current,
        exercises: applyExerciseOrder(current.exercises, workoutId, order),
      }))
    },
    onSuccess: write,
    onError: (error, _variables, context) => {
      restore(context)
      setProblem(describeFailure("Couldn't reorder the exercises", error))
    },
  })

  const removeExercise = useMutation({
    mutationFn: (removal: RemoveRequest) => routes.removeExercise(removal.exerciseRowId),
    onMutate: startAction,
    onSuccess: (updated, removal) => {
      write(updated)
      setNotice(options.removedNotice?.(updated, removal) ?? null)
    },
    onError: (error) => setProblem(describeFailure("Couldn't remove that exercise", error)),
  })

  const moveExercise = useMutation({
    mutationFn: (move: MoveRequest) => routes.moveExercise(move.exerciseRowId, move.workoutId),
    onMutate: startAction,
    onSuccess: (updated, move) => {
      write(updated)
      setNotice(`Moved ${move.name} to ${move.targetLabel}.`)
    },
    onError: (error, move) => setProblem(describeFailure(`Couldn't move ${move.name}`, error)),
  })

  // The copy's position is decided by the caller, from the resource on
  // screen (nextExercisePosition): every write on the page answers with the
  // whole resource, so what's on screen is it as of the last write — no
  // extra request needed to find "the end of B". (A route may ignore it and
  // let the backend append — the program's does.)
  const copyExercise = useMutation({
    mutationFn: (copy: CopyRequest<E>) =>
      routes.copyExercise(copy.source, copy.workoutId, copy.sortOrder),
    onMutate: startAction,
    onSuccess: (updated, copy) => {
      write(updated)
      // Said at the moment it matters: the two are now separate.
      setNotice(
        `Copied ${copy.name} to ${copy.targetLabel}. The copy is independent: changing one won't change the other.`,
      )
    },
    onError: (error, copy) => setProblem(describeFailure(`Couldn't copy ${copy.name}`, error)),
  })

  // Renaming is a plain async function, not a mutation here: each workout
  // header runs it inside ITS OWN mutation (as EditableField does with its
  // `save` prop), so each header has its own "Saving…" and its own error
  // under its own input — two headers never share one rename state.
  async function renameWorkout(workoutId: number, name: string | null) {
    startAction()
    write(await routes.renameWorkout(workoutId, name))
  }

  // True while any write that moves things around is on its way. The menus
  // and Add / Delete buttons are disabled meanwhile: a second change built
  // on a screen that's about to be replaced could name a position or a
  // workout that no longer exists.
  const isBusy =
    addWorkout.isPending ||
    removeWorkout.isPending ||
    moveExercise.isPending ||
    copyExercise.isPending

  return {
    addWorkout,
    removeWorkout,
    reorderWorkouts,
    reorderExercises,
    removeExercise,
    moveExercise,
    copyExercise,
    renameWorkout,
    isBusy,
    problem,
    notice,
    noun: options.noun,
  }
}

// The editor's state as the list components see it, whatever resource it
// edits: only what they read — each action's `mutate` and pending state —
// with the resource's own type left out (the list never needs it). The
// hook's result fits it, a template's or a program's alike: TypeScript
// checks the SHAPE (structural typing), not where an object came from.
interface Action<V> {
  mutate: (variables: V) => void
  isPending: boolean
  variables?: V
}

export interface WorkoutEditing<E> {
  addWorkout: Action<void>
  removeWorkout: Action<number>
  reorderWorkouts: Action<number[]>
  reorderExercises: Action<{ workoutId: number; order: number[] }>
  removeExercise: Action<RemoveRequest>
  moveExercise: Action<MoveRequest>
  copyExercise: Action<CopyRequest<E>>
  renameWorkout: (workoutId: number, name: string | null) => Promise<void>
  isBusy: boolean
  problem: string | null
  notice: string | null
  noun: string
}