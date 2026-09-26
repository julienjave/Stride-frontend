import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSetPreferredWeightUnit } from './useSetPreferredWeightUnit'
import { currentUserQueryKey } from './useCurrentUser'
import { userQueryKey } from '@/users/api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

const me = { id: 7, firstName: 'Julien', activeRole: 'practitioner', preferredWeightUnit: 'kg' }

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  queryClient.setQueryData(currentUserQueryKey, me)
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useSetPreferredWeightUnit(), { wrapper: Wrapper })
  const cachedUnit = () =>
    queryClient.getQueryData<typeof me>(currentUserQueryKey)?.preferredWeightUnit
  return { queryClient, result, cachedUnit }
}

// A response the test resolves by hand, whenever it chooses — the way to
// control the ORDER in which requests finish.
function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((r) => (resolve = r))
  return { promise, resolve }
}

const failure = () =>
  new Response(JSON.stringify({ statusCode: 500, message: 'Internal error' }), { status: 500 })

describe('useSetPreferredWeightUnit', () => {
  it('writes the saved user into the profile cache when the server confirms', async () => {
    const saved = { ...me, preferredWeightUnit: 'lbs' }
    fetchMock.mockResolvedValue(new Response(JSON.stringify(saved), { status: 200 }))
    const { queryClient, result, cachedUnit } = setup()

    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))

    await waitFor(() => expect(queryClient.getQueryData(userQueryKey(7))).toEqual(saved))
    expect(cachedUnit()).toBe('lbs')
  })

  // The two rules working together. Pick lbs, then kg, quickly:
  //   - scope: the kg request doesn't START until the lbs one is done, so
  //     the server receives them in the order they were picked;
  //   - the undo rule: when lbs fails, a newer pick (kg) is still
  //     pending — undoing now must not touch the screen.
  it('runs quick successive picks one at a time, and a failed older pick never undoes a newer one', async () => {
    const first = deferredResponse()
    const second = deferredResponse()
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result, cachedUnit } = setup()

    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))
    act(() => result.current.mutate({ userId: 7, unit: 'kg' }))

    // Both picks were applied to the screen at once…
    await waitFor(() => expect(cachedUnit()).toBe('kg'))
    // …but only ONE request has gone out: the second waits its turn.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"preferredWeightUnit":"lbs"}')

    // The older pick fails. The newer choice stays.
    first.resolve(failure())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(cachedUnit()).toBe('kg')

    // Only now does the second request go out, carrying the last choice.
    expect(fetchMock.mock.calls[1][1]?.body).toBe('{"preferredWeightUnit":"kg"}')
    second.resolve(new Response(JSON.stringify(me), { status: 200 }))
    await waitFor(() => expect(cachedUnit()).toBe('kg'))
  })

  // Exactly the case where "put back the unit from before this pick"
  // fails with only two values: before the FIRST pick it was kg, but the
  // user's LAST choice is lbs. Neither failure may show kg.
  it('keeps the latest choice through several failures, kg → lbs → kg → lbs', async () => {
    const responses = [deferredResponse(), deferredResponse(), deferredResponse()]
    fetchMock
      .mockReturnValueOnce(responses[0].promise)
      .mockReturnValueOnce(responses[1].promise)
      .mockReturnValueOnce(responses[2].promise)
    const { result, cachedUnit } = setup()

    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))
    act(() => result.current.mutate({ userId: 7, unit: 'kg' }))
    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))
    await waitFor(() => expect(cachedUnit()).toBe('lbs'))

    responses[0].resolve(failure())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(cachedUnit()).toBe('lbs')

    responses[1].resolve(failure())
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(cachedUnit()).toBe('lbs')

    responses[2].resolve(new Response(JSON.stringify({ ...me, preferredWeightUnit: 'lbs' }), { status: 200 }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cachedUnit()).toBe('lbs')
  })

  // When the last pick fails, the screen goes back to what the SERVER
  // holds — here lbs, saved by the first pick — not to the original kg.
  it('falls back to the last unit the server confirmed', async () => {
    const first = deferredResponse()
    const second = deferredResponse()
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result, cachedUnit } = setup()

    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))
    act(() => result.current.mutate({ userId: 7, unit: 'kg' }))

    first.resolve(new Response(JSON.stringify({ ...me, preferredWeightUnit: 'lbs' }), { status: 200 }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    second.resolve(failure())

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedUnit()).toBe('lbs')
  })

  // A quick burst where every request fails: the server never changed,
  // so the screen must end on the ORIGINAL unit — not on the unit that
  // happened to be showing when the last pick started (lbs, here).
  it('returns to the original unit when every pick in a burst fails', async () => {
    const first = deferredResponse()
    const second = deferredResponse()
    fetchMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result, cachedUnit } = setup()

    // Spaced out like real picks (the menu closes and reopens between
    // them): each pick is already on screen when the next one starts —
    // so a later pick would see an unconfirmed unit in the cache, and
    // must not mistake it for the server's.
    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))
    await waitFor(() => expect(cachedUnit()).toBe('lbs'))
    act(() => result.current.mutate({ userId: 7, unit: 'kg' }))
    await waitFor(() => expect(cachedUnit()).toBe('kg'))
    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))
    await waitFor(() => expect(cachedUnit()).toBe('lbs'))

    // Three picks, three requests needed: make the first two fail, and
    // the third too (mockResolvedValue covers every call after the two
    // queued ones).
    fetchMock.mockResolvedValue(failure())
    first.resolve(failure())
    second.resolve(failure())

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedUnit()).toBe('kg')
  })

  // Same, with the three picks started in the very same instant. This is
  // what caught the "count pending picks AFTER the await" bug: by then all
  // three had started, none counted itself as first, and nothing was ever
  // recorded to fall back to — the screen stayed on lbs.
  it('returns to the original unit even when the picks start at the same instant', async () => {
    const first = deferredResponse()
    fetchMock.mockReturnValueOnce(first.promise)
    const { result, cachedUnit } = setup()

    act(() => {
      result.current.mutate({ userId: 7, unit: 'lbs' })
      result.current.mutate({ userId: 7, unit: 'kg' })
      result.current.mutate({ userId: 7, unit: 'lbs' })
    })
    await waitFor(() => expect(cachedUnit()).toBe('lbs'))

    fetchMock.mockResolvedValue(failure())
    first.resolve(failure())

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedUnit()).toBe('kg')
  })

  // The "confirmed unit" is only recorded by the FIRST pick of a burst.
  // If the second pick recorded it too, it would record lbs — the first
  // pick's unconfirmed value — and the final undo would land on lbs,
  // a unit the server never held.
  it('never treats an unconfirmed pick as the unit to fall back to', async () => {
    const first = deferredResponse()
    fetchMock.mockReturnValueOnce(first.promise)
    const { result, cachedUnit } = setup()

    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))
    await waitFor(() => expect(cachedUnit()).toBe('lbs'))
    act(() => result.current.mutate({ userId: 7, unit: 'kg' }))
    await waitFor(() => expect(cachedUnit()).toBe('kg'))

    fetchMock.mockResolvedValue(failure())
    first.resolve(failure())

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedUnit()).toBe('kg')
  })

  it('undoes its own pick when that pick fails', async () => {
    fetchMock.mockResolvedValue(failure())
    const { result, cachedUnit } = setup()

    act(() => result.current.mutate({ userId: 7, unit: 'lbs' }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cachedUnit()).toBe('kg')
  })
})