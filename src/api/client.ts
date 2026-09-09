// The backend's own error shape, from every response the global exception
// filter produces (see docs/api/03-conventions.md). "message" is ALWAYS an
// array of strings — normalized at the backend itself specifically so a
// frontend never has to branch on whether it got a string or an array.
interface BackendErrorBody {
  statusCode: number
  message: string[]
  error: string
  timestamp: string
  path: string
}

// A custom Error subclass, rather than throwing the raw backend JSON or a
// generic Error("request failed"). Extending Error means it still behaves
// like a real JS error (has a .message, works with try/catch, shows a
// sensible stack trace) — but we attach the extra fields callers actually
// need to make decisions (statusCode, the full messages array, Retry-After
// when present), so calling code never has to re-parse a response body.
export class ApiError extends Error {
  readonly statusCode: number
  readonly messages: string[]
  readonly retryAfterSeconds?: number

  constructor(body: BackendErrorBody, retryAfterSeconds?: number) {
    // super(...) sets the standard Error.message to the first real message
    // — good enough for anywhere that just does err.message without
    // knowing about our custom fields (e.g. a generic logging call).
    super(body.message[0] ?? 'Request failed')
    this.name = 'ApiError'
    this.statusCode = body.statusCode
    this.messages = body.message
    this.retryAfterSeconds = retryAfterSeconds
  }
}

// Vite exposes .env variables through import.meta.env, but ONLY ones
// prefixed VITE_ — this is a deliberate Vite security measure, so a
// server-only secret accidentally put in .env doesn't get bundled into
// client-side JS just because someone imported it. Falling back to
// localhost:3000 means `npm run dev` works immediately with no .env setup
// required, matching the backend's own documented default port.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
}

// The one function every feature folder's API calls should go through.
// Never call fetch() directly anywhere else in this app — see FRONTEND.md's
// "single funnel" principle (the same discipline the backend applies to
// itself via toPublic()/getAllowedOrigins()).
export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    // THE single most important line in this whole file. Without this,
    // the browser never sends the connect.sid session cookie on this
    // request — every "authenticated" call would look like a fresh,
    // logged-out visitor to the backend. This has to be on every request,
    // not just login, which is exactly why it lives here once instead of
    // being repeated (and potentially forgotten) at every call site.
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  // Two genuinely different "no content to parse" cases, both real and
  // both expected — NOT errors:
  //   - 204 No Content: logout, mfa/enable, forgot-password, etc.
  //     (see docs/api/01-authentication.md's status code table)
  //   - A successful response with an empty body for any other reason
  // Trying to call response.json() on either would throw a confusing
  // "Unexpected end of JSON input" — checking for this explicitly avoids
  // that, and returning `undefined as TResponse` is safe because callers
  // expecting a 204 route should be typing that call as Promise<void>.
  if (response.status === 204) {
    return undefined as TResponse
  }

  if (!response.ok) {
    // 429 is the one status where the backend sends an extra header
    // (Retry-After, in seconds) beyond the standard error body — read it
    // here, once, so every caller automatically gets it rather than each
    // feature needing to know this header exists at all.
    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : undefined

    // response.json() genuinely returns Promise<any> — TypeScript has no
    // way to verify at compile time that a network response actually
    // matches BackendErrorBody. We accept that here via an EXPLICIT cast
    // (not an implicit any-to-typed assignment) specifically because the
    // backend's global exception filter guarantees this exact shape on
    // every error response (docs/api/03-conventions.md) — a documented,
    // load-bearing contract, not a guess.
    const body = (await response.json()) as BackendErrorBody
    throw new ApiError(body, retryAfterSeconds)
  }

  return response.json() as Promise<TResponse>
}