import { apiRequest } from '@/api/client'
import type { CurrentUser } from './types'
import type { 
  LoginFormValues, 
  MfaCodeFormValues, 
  RegisterFormValues, 
  UserRole, 
} from './schemas'


// --- AUTH/ME ---------------------------------------------------------------

export function fetchCurrentUser() {
  return apiRequest<CurrentUser>('/auth/me')
}


// --- LOGIN + MFA ----------------------------------------------------------

// POST /auth/login genuinely returns one of two different shapes at the
// SAME 201 status — a plain boolean flag bolted onto CurrentUser would
// obscure that these are two distinct outcomes with nothing else in
// common. Modeling it as a real union means TypeScript forces every
// caller to check `mfaRequired` before it'll let you access any
// CurrentUser-only field — the type system enforces the branch, rather
// than trusting every call site to remember to check.
interface MfaRequiredResponse {
  mfaRequired: true
}

export type LoginResponse = CurrentUser | MfaRequiredResponse

export function login(credentials: LoginFormValues) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

// The second step of the MFA flow. Note this does NOT need to send back
// which user is logging in — the backend already knows, via
// req.session.mfaPending (set during the login call above, riding on the
// SAME session cookie apiRequest already sends on every request via
// credentials: 'include'). This is exactly the "session, not token"
// consequence: nothing client-side needs to track or
// re-send a user/session identifier here.
export function verifyMfaCode(payload: MfaCodeFormValues) {
  return apiRequest<CurrentUser>('/auth/mfa/verify', {
    method: 'POST',
    body: payload,
  })
}


// --- LOGOUT ------------------------------------------------------------------

// POST /auth/logout returns a 204 — apiRequest already handles that case
// (returns undefined without trying to parse an empty body), so this
// function's return type is effectively Promise<void>. Nothing to send:
// the backend destroys whatever session the cookie currently points to.
export function logout() {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}


// --- SELF-REGISTRATION -------------------------------------------------------

// Unlike login(), this always returns a plain CurrentUser — never the
// mfaRequired union, since a brand-new self-registered account can't
// possibly have MFA already enabled. Registration also always logs the new
// account in immediately (backend calls req.login() as part of this same
// request) — no separate login call needed afterward.
export function register(values: RegisterFormValues) {
  // confirmPassword only ever existed for our own client-side validation
  // (see schemas.ts) — RegisterDto on the backend has no such field, and
  // the global ValidationPipe's `forbidNonWhitelisted` would reject the
  // whole request outright if we sent it. Destructuring it out here, at
  // the API boundary, keeps that "this field is UI-only" knowledge in one
  // place rather than leaking into the component.
  const { confirmPassword: _confirmPassword, phone, address, ...rest } = values

  // phone/address are optional on the backend, but an HTML text input that
  // was simply never touched reads as '' (empty string), not undefined —
  // the DOM has no concept of "this field was never filled in," only "this
  // field currently contains zero characters." If we sent '' as-is,
  // RegisterDto's @IsOptional() would NOT skip it (that decorator only
  // treats undefined/null as "absent" — an empty string is a perfectly
  // valid string, so it would sail through @IsString() and get stored as
  // a literal empty string in the database. That's a different, worse
  // outcome than the column genuinely being null: "we have a phone number
  // and it's blank" vs. "we were never given one." Converting '' back to
  // undefined here — right at the boundary before the request is built —
  // means JSON.stringify (called inside apiRequest) drops the key
  // entirely for an untouched field, which is what "optional" is actually
  // supposed to mean.
  return apiRequest<CurrentUser>('/auth/register', {
    method: 'POST',
    body: {
      ...rest,
      phone: phone === '' ? undefined : phone,
      address: address === '' ? undefined : address,
    },
  })
}


// --- SWITCHING ROLES -------------------------------------------------------------

// Always returns a full CurrentUser (like login without MFA) — the
// backend re-runs req.login() internally to mutate the session's
// activeRole, but there's no separate intermediate state to model here,
// unlike login's MFA branch.
export function switchRole(role: UserRole) {
  return apiRequest<CurrentUser>('/auth/switch-role', {
    method: 'POST',
    body: { role },
  })
}