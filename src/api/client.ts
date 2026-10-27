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
//
// Exported (Phase 5) for the messaging socket, which connects to the SAME
// server: one setting, so the REST calls and the live connection can never
// point at two different backends.
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

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
// `message`: the 401's own words — most say only "Unauthorized", but one
// explains a sign-out the person should be told about (5 failed step-ups in
// a row, decisions §16); the handler decides what to do with them.
type UnauthorizedHandler = (currentPath: string, message: string[]) => void
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
  const response = await send(path, options)

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

  // Success can mean "no body" beyond the 204 case already handled above
  // — DELETE /clinics/:id/members/:userId is a concrete real example: it
  // returns 200, not 204 (confirmed via the generated OpenAPI spec:
  // ClinicsController_removeMember's response is `200: { content?: never
  // }`), simply because there's no @HttpCode override and the handler
  // returns nothing. Calling response.json() directly on a genuinely
  // empty body throws "Unexpected end of JSON input." Reading as text
  // first and checking for emptiness handles this regardless of which
  // status code a given route happens to use for "succeeded, nothing to
  // send back" — rather than the 204 check above needing to anticipate
  // every route that might do this.
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as TResponse
}

// A FILE from the backend (Phase 6, the records export: a PDF), instead of
// JSON. The same funnel as apiRequest — the cookie, the JSON body, the
// errors and the mid-session 401 are all `send`'s — only the success is
// read differently:
//   - `blob()`: the body as raw bytes with their type (a Blob), not text —
//     a PDF read as text would be corrupted (bytes that aren't valid UTF-8
//     get replaced);
//   - the file's NAME, from the Content-Disposition header the backend
//     sends (`attachment; filename="stride-health-record-2026-10-27.pdf"`).
//     null when there is none — or when the browser hides it: across
//     origins (this app on :5173, the API on :3000) JavaScript may read only
//     a few "safelisted" headers unless the server names others in
//     Access-Control-Expose-Headers (the backend's cors-options.ts does).
//     The caller chooses a fallback name.
// What to DO with the file (save it) is the caller's: see
// common/saveFile.ts.
export interface DownloadedFile {
  blob: Blob
  fileName: string | null
}

export async function apiDownload(
  path: string,
  options: RequestOptions = {},
): Promise<DownloadedFile> {
  const response = await send(path, options)
  return {
    blob: await response.blob(),
    fileName: fileNameFromDisposition(response.headers.get('Content-Disposition')),
  }
}

// The name in `attachment; filename="…"` — the one form the backend writes
// (pdf-file.ts: a plain ASCII name in quotes). The RFC also allows an
// unquoted name and an encoded `filename*=UTF-8''…`; the backend never sends
// those, and anything this doesn't recognise falls back to the caller's
// name rather than a wrong one.
export function fileNameFromDisposition(header: string | null): string | null {
  const match = header?.match(/filename="([^"]+)"/)
  return match ? match[1] : null
}

// One request as every call sends it, and a refusal turned into an
// ApiError. Shared by apiRequest (JSON) and apiDownload (a file), so the two
// can't drift apart on the parts that matter for every call: the session
// cookie, the body, and how an error is read.
async function send(path: string, options: RequestOptions): Promise<Response> {
  // FormData is the browser's built-in container for a multipart/form-data
  // request body — the format file uploads use, since a file's raw bytes
  // can't be embedded inside a JSON string the way every other request
  // body in this app can. It needs different handling below, in two ways.
  const isFormData = options.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    // THE single most important line in this whole file. Without this,
    // the browser never sends the connect.sid session cookie on this
    // request — every "authenticated" call would look like a fresh,
    // logged-out visitor to the backend. This has to be on every request,
    // not just login, which is exactly why it lives here once instead of
    // being repeated (and potentially forgotten) at every call site.
    credentials: 'include',
    // A multipart/form-data request needs a Content-Type header with a
    // "boundary" — a unique separator string marking where one field/file
    // ends and the next begins. The browser generates that boundary and
    // sets the header itself automatically whenever the body is a FormData
    // object — but ONLY if we don't set Content-Type ourselves first. If
    // we set it manually (even to the "correct-looking"
    // 'multipart/form-data'), it would be missing that boundary, and the
    // backend's Multer interceptor would fail to parse the request at all.
    // So the rule here is: JSON bodies get an explicit Content-Type; a
    // FormData body gets none, and lets the browser fill it in correctly.
    headers: options.body && !isFormData ? { 'Content-Type': 'application/json' } : {},
    body: isFormData
      ? (options.body as FormData)
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  })

  if (!response.ok) {
    // 429 is the one status where the backend sends an extra header
    // (Retry-After, in seconds) beyond the standard error body — read it
    // here, once, so every caller automatically gets it rather than each
    // feature needing to know this header exists at all. (Across origins
    // the browser shows it only because the backend exposes it —
    // cors-options.ts.)
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
    // load-bearing contract, not a guess. (A refused DOWNLOAD answers JSON
    // too: only a success is a file.)
    const body = (await response.json()) as BackendErrorBody

    // A 401 from /auth/me is excluded deliberately — that's the routine,
    // EXPECTED "not logged in yet" bootstrap check every page load does,
    // not a session expiring mid-use. Triggering a "you were logged out"
    // redirect flow for that case would be noise, not a real event. Every
    // OTHER 401 (a session that expired or was invalidated while the user
    // was actively doing something) genuinely needs to be handled.
    if (body.statusCode === 401 && path !== '/auth/me') {
      unauthorizedHandler?.(window.location.pathname + window.location.search, body.message)
    }

    throw new ApiError(body, retryAfterSeconds)
  }

  return response
}