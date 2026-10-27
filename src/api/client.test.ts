import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  apiDownload,
  apiRequest,
  ApiError,
  fileNameFromDisposition,
  setUnauthorizedHandler,
} from './client'

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

  // A DIFFERENT empty-body case from the 204 above — some routes (e.g.
  // DELETE /clinics/:id/members/:userId, confirmed via the generated
  // OpenAPI spec: `200: { content?: never }`) return a 200 with NO body
  // at all, simply because the handler returns nothing and there's no
  // @HttpCode override forcing 204. Real fetch Responses represent that
  // as an empty string from .text() — this needs the same "don't try to
  // JSON.parse nothing" handling as the 204 case, just triggered by an
  // empty body rather than a specific status code.
  it('returns undefined for a 200 with a genuinely empty body, not just a 204', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }))

    const result = await apiRequest('/clinics/1/members/5', { method: 'DELETE' })

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

  it('exposes custom fields (e.g. roles on the multi-role login error) via .body', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          message: ['This account has multiple roles. Specify which one to log in as.'],
          error: 'BadRequestException',
          timestamp: '2026-08-05T14:22:03.101Z',
          path: '/auth/login',
          roles: ['practitioner', 'admin'],
        }),
        { status: 400 },
      ),
    )

    try {
      await apiRequest('/auth/login', { method: 'POST', body: {} })
      expect.unreachable('apiRequest should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).body.roles).toEqual(['practitioner', 'admin'])
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

  it('calls the registered unauthorized handler on a mid-session 401, with the current path and its words', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          message: ['Unauthorized'],
          error: 'Unauthorized',
          timestamp: '2026-08-05T14:22:03.101Z',
          path: '/exercises',
        }),
        { status: 401 },
      ),
    )

    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    // jsdom's window.location defaults to http://localhost:3000/ — good
    // enough to confirm the handler receives A path, without needing to
    // fake a navigation to some other URL first.
    await expect(apiRequest('/exercises')).rejects.toThrow(ApiError)

    expect(handler).toHaveBeenCalledWith('/', ['Unauthorized'])

    // Reset the handler so this test doesn't leak into others — module-
    // level registration state persists across tests in this file
    // otherwise.
    setUnauthorizedHandler(() => {})
  })

  it('does NOT call the unauthorized handler for /auth/me\'s own 401 — that is the routine bootstrap check, not a session expiring', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          message: ['Unauthorized'],
          error: 'Unauthorized',
          timestamp: '2026-08-05T14:22:03.101Z',
          path: '/auth/me',
        }),
        { status: 401 },
      ),
    )

    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(apiRequest('/auth/me')).rejects.toThrow(ApiError)

    expect(handler).not.toHaveBeenCalled()

    setUnauthorizedHandler(() => {})
  })
})

// A FILE instead of JSON (the records export, decisions §20). The same
// funnel — these tests check what apiDownload adds, and that what it shares
// with apiRequest (the cookie, the body, the errors) really is shared.
describe('apiDownload', () => {
  const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xe2, 0x9c, 0x93, 0xff])

  it('hands back the body as bytes, untouched, with the name from Content-Disposition', async () => {
    fetchMock.mockResolvedValue(
      new Response(PDF_BYTES, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="stride-health-record-2031-03-10.pdf"',
        },
      }),
    )

    const file = await apiDownload('/records-export?timeZone=Europe%2FParis')

    expect(file.fileName).toBe('stride-health-record-2031-03-10.pdf')
    expect(file.blob.type).toBe('application/pdf')
    // Byte for byte — 0xff is not valid UTF-8: reading the body as text
    // would have replaced it.
    expect(new Uint8Array(await file.blob.arrayBuffer())).toStrictEqual(PDF_BYTES)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/records-export?timeZone=Europe%2FParis',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  // What the browser shows a page when the header isn't exposed across
  // origins: nothing.
  it('has no name when the header can not be read', async () => {
    fetchMock.mockResolvedValue(new Response(PDF_BYTES, { status: 200 }))
    expect((await apiDownload('/records-export')).fileName).toBeNull()
  })

  it('sends a JSON body like apiRequest does', async () => {
    fetchMock.mockResolvedValue(new Response(PDF_BYTES, { status: 200 }))

    await apiDownload('/records-export/download', {
      method: 'POST',
      body: { token: 'abc', dateOfBirth: '1990-04-12' },
    })

    const [url, requestInit] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:3000/records-export/download')
    expect(requestInit!.method).toBe('POST')
    expect(requestInit!.credentials).toBe('include')
    expect(requestInit!.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(requestInit!.body).toBe('{"token":"abc","dateOfBirth":"1990-04-12"}')
  })

  // A refused download answers JSON, like any refusal: the same ApiError,
  // with its extra fields and Retry-After.
  it('throws the same ApiError as apiRequest for a refusal', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 400,
          message: ["This date of birth doesn't match the one on file."],
          error: 'Bad Request',
          timestamp: '2031-03-10T12:00:00.000Z',
          path: '/records-export/download',
          attemptsLeft: 4,
        }),
        { status: 400, headers: { 'Retry-After': '7' } },
      ),
    )

    const error = await apiDownload('/records-export/download', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).statusCode).toBe(400)
    expect((error as ApiError).messages).toEqual(["This date of birth doesn't match the one on file."])
    expect((error as ApiError).body.attemptsLeft).toBe(4)
    expect((error as ApiError).retryAfterSeconds).toBe(7)
  })

  it('reports a mid-session 401 to the handler, like apiRequest', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 401,
          message: ['Unauthorized'],
          error: 'Unauthorized',
          timestamp: '2031-03-10T12:00:00.000Z',
          path: '/records-export',
        }),
        { status: 401 },
      ),
    )
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(apiDownload('/records-export')).rejects.toThrow(ApiError)
    expect(handler).toHaveBeenCalledWith('/', ['Unauthorized'])

    setUnauthorizedHandler(() => {})
  })
})

describe('fileNameFromDisposition', () => {
  it('reads the quoted name the backend writes', () => {
    expect(fileNameFromDisposition('attachment; filename="stride-health-record-2031-03-10.pdf"')).toBe(
      'stride-health-record-2031-03-10.pdf',
    )
  })

  // Anything else falls back to the caller's name rather than a wrong one.
  it('finds nothing in any other form, or without a header', () => {
    expect(fileNameFromDisposition(null)).toBeNull()
    expect(fileNameFromDisposition('attachment')).toBeNull()
    expect(fileNameFromDisposition('attachment; filename=""')).toBeNull()
    expect(fileNameFromDisposition("attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf")).toBeNull()
  })
})