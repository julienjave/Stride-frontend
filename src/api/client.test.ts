import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiRequest, ApiError } from './client'

// Replace the real global fetch with a mock we control for every test —
// this is what lets us test client.ts's OWN logic (how it builds a
// request, how it interprets a response) without any real network call
// or backend needing to exist. We assert on how fetch was CALLED
// (arguments) and control what it RETURNS (a fake Response).
const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

describe('apiRequest', () => {
  it('always sends credentials: include, the one non-negotiable line in this file', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    )

    await apiRequest('/health')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('returns undefined for a 204, without trying to parse an empty body as JSON', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    const result = await apiRequest('/auth/logout', { method: 'POST' })

    expect(result).toBeUndefined()
  })

  it('parses and returns a successful JSON response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, email: 'a@b.com' }), {
        status: 200,
      }),
    )

    const result = await apiRequest<{ id: number; email: string }>(
      '/auth/me',
    )

    expect(result).toEqual({ id: 1, email: 'a@b.com' })
  })

  it('throws an ApiError with the real message array on a 404', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 404,
          message: ['Exercise 501 not found'],
          error: 'NotFoundException',
          timestamp: '2026-08-05T14:22:03.101Z',
          path: '/exercises/501',
        }),
        { status: 404 },
      ),
    )

    // .rejects.toThrow lets us assert on a promise that's expected to
    // reject, rather than needing a manual try/catch in the test itself.
    await expect(apiRequest('/exercises/501')).rejects.toThrow(ApiError)

    // Reset and reconfigure the same mock to inspect the error's actual
    // fields, not just that SOME error was thrown — the whole reason
    // messages is exposed as a real array is so a UI can render every
    // validation issue, not just the first.
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 404,
          message: ['Exercise 501 not found'],
          error: 'NotFoundException',
          timestamp: '2026-08-05T14:22:03.101Z',
          path: '/exercises/501',
        }),
        { status: 404 },
      ),
    )
    try {
      await apiRequest('/exercises/501')
      expect.unreachable('apiRequest should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).statusCode).toBe(404)
      expect((err as ApiError).messages).toEqual(['Exercise 501 not found'])
    }
  })

  it('reads Retry-After on a 429 and exposes it as retryAfterSeconds', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 429,
          message: ['ThrottlerException: Too Many Requests'],
          error: 'ThrottlerException',
          timestamp: '2026-08-05T14:22:03.101Z',
          path: '/auth/login',
        }),
        { status: 429, headers: { 'Retry-After': '42' } },
      ),
    )

    try {
      await apiRequest('/auth/login', { method: 'POST', body: {} })
      expect.unreachable('apiRequest should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).retryAfterSeconds).toBe(42)
    }
  })

  it('sends a JSON body and Content-Type header only when a body is actually provided', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 201 }),
    )

    await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'a@b.com', password: 'secret123' },
    })

    const [, requestInit] = fetchMock.mock.calls[0]
    // Non-null assertion (!) — fetch's own type makes `init` optional in
    // general, but apiRequest always passes it, so we're asserting
    // something we've verified true for this specific call, not
    // side-stepping a real unknown.
    expect(requestInit!.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(requestInit!.body).toBe(
      JSON.stringify({ email: 'a@b.com', password: 'secret123' }),
    )
  })
})