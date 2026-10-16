import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { describeFailure } from '@/workouts/useWorkoutEditing'
import { sessionQueryKey, updateSessionExercise } from './api'
import { applyExerciseChanges, previousValues } from './sessionRules'
import type { Session, SessionExerciseChanges } from './types'

// One change to a checklist row: which row, what changes, and how to name it
// if saving fails ("Couldn't save “Done” for Squat").
export interface ExerciseUpdate {
  rowId: number
  changes: SessionExerciseChanges
  failure: string
}

// Ticks, ratings and notes — OPTIMISTIC (decided 2026-10-16): a patient on a
// phone, maybe on a weak connection, sees the tick at once instead of
// waiting for the server. Concepts, in order:
//
//   1. onMutate (runs at once): stop any refetch of the session on its way
//      (it would bring the OLD row back over the guess), remember the
//      changed fields' current values, and write the guess into the cache.
//   2. The requests go ONE AT A TIME: TanStack Query's mutation `scope` —
//      mutations sharing a scope id wait in a queue, so two quick ticks reach
//      the server in the order they were made. (onMutate still runs at once
//      for a queued one: the screen never waits.)
//   3. onSuccess: write the server's answer — the truth — but only when no
//      other change of this session is still queued or on its way: an older
//      answer would wipe the newer guesses shown on screen. The last one to
//      finish writes. (`isMutating` counts this one too: 1 = only me.)
//   4. onError: put back ONLY the fields this change touched (not a snapshot
//      of the whole session, which would also undo a later change still
//      queued), say what failed, and — when nothing else is pending — ask the
//      server for the truth (a 409 may mean the session was finished
//      elsewhere: the page then turns read-only by itself).
export function useUpdateSessionExercise(sessionId: number) {
  const queryClient = useQueryClient()
  const key = sessionQueryKey(sessionId)
  const mutationKey = ['session-exercise-update', sessionId]
  // One message for the whole player: the last failure, cleared by the next
  // change (the workout editor's pattern — useWorkoutEditing).
  const [problem, setProblem] = useState<string | null>(null)

  const onlyMe = () => queryClient.isMutating({ mutationKey }) <= 1

  const mutation = useMutation({
    mutationKey,
    scope: { id: `session-exercise-update-${sessionId}` },
    mutationFn: ({ rowId, changes }: ExerciseUpdate) =>
      updateSessionExercise(sessionId, rowId, changes),
    onMutate: async ({ rowId, changes }: ExerciseUpdate) => {
      setProblem(null)
      await queryClient.cancelQueries({ queryKey: key })
      const current = queryClient.getQueryData<Session>(key)
      if (!current) return { previous: {} }
      queryClient.setQueryData<Session>(key, applyExerciseChanges(current, rowId, changes))
      return { previous: previousValues(current, rowId, changes) }
    },
    onSuccess: (session) => {
      if (onlyMe()) queryClient.setQueryData(key, session)
    },
    onError: (error, { rowId, failure }, context) => {
      const current = queryClient.getQueryData<Session>(key)
      if (current && context) {
        queryClient.setQueryData<Session>(key, applyExerciseChanges(current, rowId, context.previous))
      }
      setProblem(describeFailure(failure, error))
      if (onlyMe()) void queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return { update: mutation.mutate, problem }
}