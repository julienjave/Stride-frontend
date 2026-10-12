import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { applyExerciseOrder, applyWorkoutOrder } from '@/workouts/workoutGroups'
import {
  addTemplateWorkout,
  copyTemplateExercise,
  moveTemplateExercise,
  programQueryKey,
  removeTemplateExercise,
  removeTemplateWorkout,
  renameTemplateWorkout,
  reorderTemplateExercises,
  reorderTemplateWorkouts,
} from './api'
import type { ProgramTemplateDetail, TemplateExercise } from './types'

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

// Every write the workout editor makes on a TEMPLATE, in one hook. The list
// and its headers only call these and show their state; they don't know
// which URLs exist or how the cache works. The program page (3b) will get
// its own twin of this hook with the program routes — and reuse the same
// components.
//
// Each write answers with the full template, which REPLACES the cache entry
// (`setQueryData`): the server's version of the whole template, never a
// patched guess. Two writes are also shown BEFORE the answer
// ("optimistic"): the drags. A dropped card that jumps back for half a
// second until the server answers feels broken, so the screen moves it at
// once — and puts back the previous state if the server refuses.
//
// One message area for the whole editor, `problem` (role="alert") and
// `notice` (a polite live region): whichever action happened last speaks.
// Starting any action clears both, so an old message never describes a
// newer state.
export function useTemplateWorkoutEditing(templateId: number) {
  const queryClient = useQueryClient()
  const key = programQueryKey(templateId)
  const [problem, setProblem] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function writeTemplate(updated: ProgramTemplateDetail) {
    queryClient.setQueryData(key, updated)
  }

  function startAction() {
    setProblem(null)
    setNotice(null)
  }

  // The shared shape of an optimistic write: stop any refetch that could
  // overwrite the guess (`cancelQueries`), remember the current template,
  // write the guess; on failure write the remembered one back.
  async function guess(change: (current: ProgramTemplateDetail) => ProgramTemplateDetail) {
    await queryClient.cancelQueries({ queryKey: key })
    const previous = queryClient.getQueryData<ProgramTemplateDetail>(key)
    if (previous) {
      queryClient.setQueryData(key, change(previous))
    }
    return { previous }
  }

  function restore(context: { previous?: ProgramTemplateDetail } | undefined) {
    if (context?.previous) {
      queryClient.setQueryData(key, context.previous)
    }
  }

  const addWorkout = useMutation({
    mutationFn: () => addTemplateWorkout(templateId),
    onMutate: startAction,
    onSuccess: writeTemplate,
    onError: (error) => setProblem(describeFailure("Couldn't add a workout", error)),
  })

  const removeWorkout = useMutation({
    mutationFn: (workoutId: number) => removeTemplateWorkout(templateId, workoutId),
    onMutate: startAction,
    onSuccess: writeTemplate,
    onError: (error) => setProblem(describeFailure("Couldn't delete that workout", error)),
  })

  const reorderWorkouts = useMutation({
    mutationFn: (order: number[]) => reorderTemplateWorkouts(templateId, order),
    onMutate: (order) => {
      startAction()
      return guess((current) => ({
        ...current,
        workouts: applyWorkoutOrder(current.workouts, order),
      }))
    },
    onSuccess: writeTemplate,
    onError: (error, _order, context) => {
      restore(context)
      setProblem(describeFailure("Couldn't reorder the workouts", error))
    },
  })

  const reorderExercises = useMutation({
    mutationFn: ({ workoutId, order }: { workoutId: number; order: number[] }) =>
      reorderTemplateExercises(templateId, workoutId, order),
    onMutate: ({ workoutId, order }) => {
      startAction()
      return guess((current) => ({
        ...current,
        exercises: applyExerciseOrder(current.exercises, workoutId, order),
      }))
    },
    onSuccess: writeTemplate,
    onError: (error, _variables, context) => {
      restore(context)
      setProblem(describeFailure("Couldn't reorder the exercises", error))
    },
  })

  const removeExercise = useMutation({
    mutationFn: (templateExerciseId: number) =>
      removeTemplateExercise(templateId, templateExerciseId),
    onMutate: startAction,
    onSuccess: writeTemplate,
    onError: (error) => setProblem(describeFailure("Couldn't remove that exercise", error)),
  })

  // `name` and `targetLabel` travel with the request only for the messages:
  // "Moved Squat to B · Strength." The card the message is about has just
  // jumped to another workout — possibly off screen — so the message says
  // where it went.
  const moveExercise = useMutation({
    mutationFn: (move: { exerciseRowId: number; workoutId: number; name: string; targetLabel: string }) =>
      moveTemplateExercise(templateId, move.exerciseRowId, move.workoutId),
    onMutate: startAction,
    onSuccess: (updated, move) => {
      writeTemplate(updated)
      setNotice(`Moved ${move.name} to ${move.targetLabel}.`)
    },
    onError: (error, move) =>
      setProblem(describeFailure(`Couldn't move ${move.name}`, error)),
  })

  // The copy's position is decided by the caller, from the template on
  // screen (nextExercisePosition): every write on this page answers with the
  // whole template, so what's on screen is the template as of the last
  // write — no extra request needed to find "the end of B".
  const copyExercise = useMutation({
    mutationFn: (copy: {
      source: TemplateExercise
      workoutId: number
      sortOrder: number
      name: string
      targetLabel: string
    }) => copyTemplateExercise(templateId, copy.source, copy.workoutId, copy.sortOrder),
    onMutate: startAction,
    onSuccess: (updated, copy) => {
      writeTemplate(updated)
      // Said at the moment it matters: the two are now separate.
      setNotice(
        `Copied ${copy.name} to ${copy.targetLabel}. The copy is independent: changing one won't change the other.`,
      )
    },
    onError: (error, copy) =>
      setProblem(describeFailure(`Couldn't copy ${copy.name}`, error)),
  })

  // Renaming is a plain async function, not a mutation here: each workout
  // header runs it inside ITS OWN mutation (as EditableField does with its
  // `save` prop), so each header has its own "Saving…" and its own error
  // under its own input — two headers never share one rename state.
  async function renameWorkout(workoutId: number, name: string | null) {
    startAction()
    writeTemplate(await renameTemplateWorkout(templateId, workoutId, name))
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
  }
}