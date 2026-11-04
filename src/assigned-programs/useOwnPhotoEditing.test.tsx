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
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { assignedProgramQueryKey } from './api'
import { useOwnPhotoEditing } from './useOwnPhotoEditing'
import type { AssignedProgramDetail, AssignedProgramExercise } from './types'

// The reorder's OPTIMISTIC update (the drag itself needs a real browser to
// measure layout — checked in Chromium): the guess written at once — the own
// photos in the new order, and `images` too when they're the ones shown —,
// the server's answer written over it, the remembered program put back on a
// failure, and a re-read on its way cancelled first.

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

const A = { objectKey: 'k/a.png', url: 'https://s/a.png' }
const B = { objectKey: 'k/b.png', url: 'https://s/b.png' }
const C = { objectKey: 'k/c.png', url: 'https://s/c.png' }

function exercise(id: number, fields: Partial<AssignedProgramExercise>): AssignedProgramExercise {
  return {
    id,
    assignedProgramId: 12,
    workoutId: 57,
    exerciseId: 5,
    name: 'Glute Bridge',
    primaryMuscles: ['glutes'],
    secondaryMuscles: [],
    equipment: [],
    instructions: ['Lift'],
    sets: null,
    reps: null,
    durationInSeconds: null,
    weight: null,
    weightUnit: null,
    sortOrder: 0,
    notes: null,
    retiredAt: null,
    retiredBy: null,
    images: [],
    useLibraryImages: true,
    ownImages: [],
    ...fields,
  }
}

function program(row: AssignedProgramExercise): AssignedProgramDetail {
  return {
    id: 12,
    patientId: 6,
    assignedBy: 3,
    basedOnTemplateId: 1,
    basedOnProgramId: null,
    title: 'Knee Rehab — Pat',
    startDate: '2031-06-02',
    endDate: null,
    status: 'active',
    isArchived: false,
    allowSwaps: true,
    lateMakeUpDays: null,
    schedules: [],
    workouts: [{ id: 57, assignedProgramId: 12, name: null, sortOrder: 0 }],
    // A neighbour row, which a reorder must never touch.
    exercises: [row, exercise(102, { ownImages: [C], useLibraryImages: false, images: [{ url: C.url }] })],
    retiredExercises: [],
  }
}

let queryClient: QueryClient
function setUp(row: AssignedProgramExercise) {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  queryClient.setQueryData(assignedProgramQueryKey(12), program(row))
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useOwnPhotoEditing(12, 101), { wrapper })
}
const cached = () => queryClient.getQueryData<AssignedProgramDetail>(assignedProgramQueryKey(12))!
const row = () => cached().exercises.find((e) => e.id === 101)!

// A request held until the test releases it.
function holdNext(answer: () => Response) {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  fetchMock.mockImplementationOnce(() => held.then(answer))
  return () => release()
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe('useOwnPhotoEditing — reorder', () => {
  it("shows the new order at once, in `images` too when the own photos are shown, and only on that row", async () => {
    const own = exercise(101, { useLibraryImages: false, ownImages: [A, B], images: [{ url: A.url }, { url: B.url }] })
    const { result } = setUp(own)
    const release = holdNext(() => json(program({ ...own, ownImages: [B, A], images: [{ url: B.url }, { url: A.url }] })))

    act(() => result.current.reorder.mutate(['k/b.png', 'k/a.png']))

    await waitFor(() => expect(row().ownImages).toEqual([B, A]))
    expect(row().images).toEqual([{ url: B.url }, { url: A.url }])
    expect(cached().exercises[1].ownImages).toEqual([C])
    expect(result.current.isBusy).toBe(true)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"order":["k/b.png","k/a.png"]}' })

    release()
    await waitFor(() => expect(result.current.isBusy).toBe(false))
    expect(row().ownImages).toEqual([B, A])
  })

  // The library's photos are shown: `images` is a different list, untouched.
  it("leaves `images` alone when the library's photos are shown", async () => {
    const library = [{ url: 'https://s/library.jpg' }]
    const withLibrary = exercise(101, { useLibraryImages: true, ownImages: [A, B], images: library })
    const { result } = setUp(withLibrary)
    holdNext(() => json(program(withLibrary)))

    act(() => result.current.reorder.mutate(['k/b.png', 'k/a.png']))

    await waitFor(() => expect(row().ownImages).toEqual([B, A]))
    expect(row().images).toEqual(library)
  })

  it('puts the order back, and says so, when the server refuses', async () => {
    const own = exercise(101, { useLibraryImages: false, ownImages: [A, B], images: [{ url: A.url }, { url: B.url }] })
    const { result } = setUp(own)
    const release = holdNext(() =>
      json(
        { statusCode: 400, message: ["The new order must contain exactly this exercise's own photos, just reordered"], error: 'Bad Request' },
        400,
      ),
    )

    act(() => result.current.reorder.mutate(['k/b.png', 'k/a.png']))
    await waitFor(() => expect(row().ownImages).toEqual([B, A]))

    release()
    await waitFor(() => expect(row().ownImages).toEqual([A, B]))
    expect(row().images).toEqual([{ url: A.url }, { url: B.url }])
    expect(result.current.problem).toBe(
      "Couldn't reorder the photos. The new order must contain exactly this exercise's own photos, just reordered",
    )
  })

  // A re-read of the program on its way when the drag lands would answer
  // with the OLD order after the guess: it is cancelled first.
  it('cancels a re-read of the program on its way', async () => {
    const own = exercise(101, { useLibraryImages: false, ownImages: [A, B], images: [{ url: A.url }, { url: B.url }] })
    const { result } = setUp(own)
    let reread!: () => void
    const rereadHeld = new Promise<void>((resolve) => {
      reread = resolve
    })
    // The re-read (GET) is held; the PATCH answers the new order at once.
    fetchMock.mockImplementation((_input, init) =>
      (init?.method ?? 'GET') === 'GET'
        ? rereadHeld.then(() => json(program(own)))
        : Promise.resolve(json(program({ ...own, ownImages: [B, A], images: [{ url: B.url }, { url: A.url }] }))),
    )
    void queryClient.fetchQuery({
      queryKey: assignedProgramQueryKey(12),
      queryFn: () => fetch('/assigned-programs/12').then((r) => r.json() as Promise<AssignedProgramDetail>),
      staleTime: 0,
    }).catch(() => undefined)

    act(() => result.current.reorder.mutate(['k/b.png', 'k/a.png']))
    await waitFor(() => expect(result.current.isBusy).toBe(false))
    reread()
    // Give the cancelled re-read every chance to land.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(row().ownImages).toEqual([B, A])
  })
})