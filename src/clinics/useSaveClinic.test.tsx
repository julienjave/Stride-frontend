import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSaveClinic } from './useSaveClinic'
import { clinicQueryKey, clinicsListQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

const clinic = {
  id: 1,
  name: 'Acme Clinic',
  email: 'acme@example.com',
  phone: '555-1234',
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
  website: null,
  logoUrl: null,
  isActive: true,
}

function setup() {
  const queryClient = new QueryClient()
  queryClient.setQueryData(clinicQueryKey(1), clinic)
  queryClient.setQueryData(clinicsListQueryKey(false), [clinic])
  queryClient.setQueryData(clinicsListQueryKey(true), [clinic])
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const { result } = renderHook(() => useSaveClinic(1), { wrapper: Wrapper })
  return { queryClient, save: result.current }
}

describe('useSaveClinic', () => {
  it('sends exactly the given fields as a PATCH', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ...clinic, phone: null }), { status: 200 }),
    )
    const { save } = setup()
    await save({ phone: null })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toEqual(expect.stringMatching(/\/clinics\/1$/))
    expect(init?.method).toBe('PATCH')
    expect(init?.body).toBe('{"phone":null}')
  })

  it('writes the response into the detail cache, and marks BOTH list variants stale — never the detail entry', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ...clinic, name: 'Renamed' }), { status: 200 }),
    )
    const { queryClient, save } = setup()
    await save({ name: 'Renamed' })

    expect(queryClient.getQueryData(clinicQueryKey(1))).toEqual({ ...clinic, name: 'Renamed' })
    expect(queryClient.getQueryState(clinicsListQueryKey(false))?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(clinicsListQueryKey(true))?.isInvalidated).toBe(true)
    // The prefix-collision bug this key layout prevents: the freshly
    // written detail entry must NOT be marked stale.
    expect(queryClient.getQueryState(clinicQueryKey(1))?.isInvalidated).toBe(false)
  })
})