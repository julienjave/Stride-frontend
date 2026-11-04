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

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { describeFailure, useTemplateWorkoutEditing } from './useTemplateWorkoutEditing'
import { fetchProgram, programQueryKey } from './api'
import type { ProgramTemplateDetail, TemplateExercise } from './types'

// The two DRAG writes (reorder workouts, reorder a workout's exercises):
// jsdom can't run a real drag, so the hook is driven directly — the request
// it sends, the guess it shows at once, and what happens to the guess when
// the server answers or refuses.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

const ex = (id: number, workoutId: number, sortOrder: number): TemplateExercise => ({
  id,
  templateId: 1,
  workoutId,
  exerciseId: id + 100,
  sets: null,
  reps: null,
  durationInSeconds: null,
  weight: null,
  weightUnit: null,
  sortOrder,
  notes: null,
  exercise: null,
})

type Editing = ReturnType<typeof useTemplateWorkoutEditing>

const template: ProgramTemplateDetail = {
  id: 1,
  practitionerId: 7,
  title: 'Knee Rehab',
  description: null,
  isArchived: false,
  workouts: [
    { id: 57, templateId: 1, name: 'Mobility', sortOrder: 0 },
    { id: 58, templateId: 1, name: null, sortOrder: 1 },
  ],
  exercises: [ex(1, 57, 0), ex(2, 57, 1), ex(3, 58, 0), ex(4, 58, 1)],
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
  queryClient.setQueryData(programQueryKey(1), template)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(() => useTemplateWorkoutEditing(1), { wrapper })
  const cached = () => queryClient.getQueryData<ProgramTemplateDetail>(programQueryKey(1))
  return { result, cached, queryClient }
}

// A request that only answers when the test says so — to look at the
// screen's state WHILE it's on its way. The returned function answers it
// inside an act() whose callback returns a promise: act() then returns a
// promise too, which settles once React has finished every update the
// answer causes — so the test's `await` really waits. (A callback returning
// nothing makes act() return nothing to await.)
function pendingResponse() {
  let answer: (response: Response) => void = () => {}
  fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answer = resolve)))
  return (response: Response) =>
    act(() => {
      answer(response)
      return Promise.resolve()
    })
}

describe('useTemplateWorkoutEditing — reordering workouts', () => {
  it('sends the whole new order and shows it at once, before the answer', async () => {
    const answer = pendingResponse()
    const { result, cached } = setup()

    act(() => result.current.reorderWorkouts.mutate([58, 57]))

    await waitFor(() => expect(cached()?.workouts.map((w) => w.id)).toStrictEqual([58, 57]))
    expect(cached()?.workouts.map((w) => w.sortOrder)).toStrictEqual([0, 1])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/programs\/1\/workouts$/),
      expect.objectContaining({ method: 'PATCH', body: '{"order":[58,57]}' }),
    )

    // The server's answer then replaces the guess, whatever it says.
    const fromServer = { ...template, title: 'From the server' }
    await answer(jsonResponse(fromServer))
    await waitFor(() => expect(cached()).toStrictEqual(fromServer))
  })

  it('puts the previous order back, and says so, when the server refuses', async () => {
    const answer = pendingResponse()
    const { result, cached } = setup()

    act(() => result.current.reorderWorkouts.mutate([58, 57]))
    await waitFor(() => expect(cached()?.workouts[0].id).toBe(58))
    await answer(jsonResponse({ statusCode: 500, message: ['Internal error'] }, 500))

    await waitFor(() => expect(cached()).toStrictEqual(template))
    expect(result.current.problem).toBe(
      "Couldn't reorder the workouts. Something went wrong on our side. Try again in a moment.",
    )
  })
})

describe('useTemplateWorkoutEditing — a refetch already on its way', () => {
  it("is cancelled, so its older answer can't overwrite the guess", async () => {
    const { result, cached, queryClient } = setup()
    // A refetch of the template starts (as when the window regains focus)…
    const answerRefetch = pendingResponse()
    void queryClient
      .fetchQuery({ queryKey: programQueryKey(1), queryFn: () => fetchProgram(1), staleTime: 0 })
      .catch(() => {}) // cancelled: its promise rejects, by design
    // …then a drag, whose request stays on its way.
    pendingResponse()
    act(() => result.current.reorderWorkouts.mutate([58, 57]))
    await waitFor(() => expect(cached()?.workouts[0].id).toBe(58))

    // The refetch's answer (the OLD order) arrives: it must be ignored.
    await answerRefetch(jsonResponse(template))
    expect(cached()?.workouts.map((w) => w.id)).toStrictEqual([58, 57])
  })
})

describe('useTemplateWorkoutEditing — reordering a workout’s exercises', () => {
  it("sends the workout and its new order, and moves only that workout's cards at once", async () => {
    const answer = pendingResponse()
    const { result, cached } = setup()

    act(() => result.current.reorderExercises.mutate({ workoutId: 58, order: [4, 3] }))

    await waitFor(() =>
      expect(cached()?.exercises.map((e) => e.id)).toStrictEqual([1, 2, 4, 3]),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/programs\/1\/exercises$/),
      expect.objectContaining({ method: 'PATCH', body: '{"workoutId":58,"order":[4,3]}' }),
    )
    await answer(jsonResponse(template))
  })

  it('puts the previous order back, with the reason, when the server refuses', async () => {
    const answer = pendingResponse()
    const { result, cached } = setup()

    act(() => result.current.reorderExercises.mutate({ workoutId: 58, order: [4, 3] }))
    await waitFor(() => expect(cached()?.exercises[2].id).toBe(4))
    await answer(
      jsonResponse(
        {
          statusCode: 400,
          message: ['The new order must contain exactly the exercises currently in this workout'],
        },
        400,
      ),
    )

    await waitFor(() => expect(cached()).toStrictEqual(template))
    expect(result.current.problem).toBe(
      "Couldn't reorder the exercises. The new order must contain exactly the exercises currently in this workout",
    )
  })
})

describe('useTemplateWorkoutEditing — other writes', () => {
  it('renaming writes the answer into the cache', async () => {
    const renamed = {
      ...template,
      workouts: [template.workouts[0], { ...template.workouts[1], name: 'Strength' }],
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(renamed))
    const { result, cached } = setup()

    await act(() => result.current.renameWorkout(58, 'Strength'))

    expect(cached()).toStrictEqual(renamed)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/programs\/1\/workouts\/58$/),
      expect.objectContaining({ method: 'PATCH', body: '{"name":"Strength"}' }),
    )
  })

  // Each write that changes WHAT is where makes the editor busy (its menus
  // and buttons are disabled meanwhile).
  it.each([
    ['adding a workout', (r: Editing) => r.addWorkout.mutate()],
    ['deleting a workout', (r: Editing) => r.removeWorkout.mutate(58)],
    [
      'moving an exercise',
      (r: Editing) =>
        r.moveExercise.mutate({ exerciseRowId: 1, workoutId: 58, name: 'Squat', targetLabel: 'B' }),
    ],
    [
      'copying an exercise',
      (r: Editing) =>
        r.copyExercises.mutate({ exerciseIds: [1], target: { workoutId: 58 }, subject: 'Squat', targetLabel: 'B' }),
    ],
  ])('is busy while %s is on its way, and not after', async (_name, start) => {
    const answer = pendingResponse()
    const { result } = setup()
    expect(result.current.isBusy).toBe(false)

    act(() => start(result.current))
    await waitFor(() => expect(result.current.isBusy).toBe(true))

    await answer(jsonResponse(template))
    await waitFor(() => expect(result.current.isBusy).toBe(false))
  })
})

// A complete backend error body (the shape HttpExceptionFilter sends), so
// ApiError gets what it really receives.
function apiError(statusCode: number, message: string[]) {
  return new ApiError({
    statusCode,
    message,
    error: 'Error',
    timestamp: '2031-01-01T00:00:00.000Z',
    path: '/programs/1',
  })
}

describe('describeFailure', () => {
  it("shows the backend's reason for a refusal (4xx)", () => {
    const error = apiError(409, ['Workout B still has exercises', 'And more'])
    expect(describeFailure("Couldn't delete that workout", error)).toBe(
      "Couldn't delete that workout. Workout B still has exercises And more",
    )
  })

  // The why comes from the app's one rule (failureText): a server error
  // gets the shared sentence, no answer at all "Try again.".
  it('says the shared sentence for a server error, and "Try again." for a network failure', () => {
    const serverError = apiError(500, ['Internal error'])
    expect(describeFailure("Couldn't add a workout", serverError)).toBe(
      "Couldn't add a workout. Something went wrong on our side. Try again in a moment.",
    )
    expect(describeFailure("Couldn't add a workout", new TypeError('Failed to fetch'))).toBe(
      "Couldn't add a workout. Try again.",
    )
  })
})