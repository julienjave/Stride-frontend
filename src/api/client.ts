// The backend's own error shape, from every response the global exception
// filter produces (see docs/api/03-conventions.md). "message" is ALWAYS an
// array of strings — normalized at the backend itself specifically so a
// frontend never has to branch on whether it got a string or an array.
// The index signature accounts for the filter's "extra" mechanism: some
// exceptions (e.g. the multi-role login case) attach additional custom
// fields like `roles` alongside the standard ones.
interface BackendErrorBody {
  statusCode: number
  message: string[]
  error: string
  timestamp: string
  path: string
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly statusCode: number
  readonly messages: string[]
  readonly retryAfterSeconds?: number
  // The full parsed error body, kept around so callers can read a custom
  // field (e.g. `error.body.roles` for the multi-role login case) without
  // ApiError needing a dedicated property for every possible backend-
  // specific extra that might ever exist. Typed as unknown per key — the
  // caller is responsible for narrowing before use, same as reading
  // anything else off a network response.
  readonly body: BackendErrorBody

  constructor(body: BackendErrorBody, retryAfterSeconds?: number) {
    super(body.message[0] ?? 'Request failed')
    this.name = 'ApiError'
    this.statusCode = body.statusCode
    this.messages = body.message
    this.retryAfterSeconds = retryAfterSeconds
    this.body = body
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

// A registration slot, not a direct import of react-router or the auth
// query cache — client.ts stays a plain module with zero React/Router
// dependencies. Whoever composes the app (app/routes.tsx, where the
// router itself is created) registers a real handler here once; client.ts
// just knows "call this function when a mid-session 401 happens," without
// needing to know WHAT that function does.
type UnauthorizedHandler = (currentPath: string) => void
let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler
}

// The one function every feature folder's API calls should go through.
// Never call fetch() directly anywhere else in this app — 
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

    // A 401 from /auth/me is excluded deliberately — that's the routine,
    // EXPECTED "not logged in yet" bootstrap check every page load does,
    // not a session expiring mid-use. Triggering a "you were logged out"
    // redirect flow for that case would be noise, not a real event. Every
    // OTHER 401 (a session that expired or was invalidated while the user
    // was actively doing something) genuinely needs to be handled.
    if (body.statusCode === 401 && path !== '/auth/me') {
      unauthorizedHandler?.(window.location.pathname + window.location.search)
    }

    throw new ApiError(body, retryAfterSeconds)
  }

  return response.json() as Promise<TResponse>
}