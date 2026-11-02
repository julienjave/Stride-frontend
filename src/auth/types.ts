import type { Address } from '@/common/address/types'
import type { WeightUnit } from '@/common/weight'

// The real shape GET /auth/me, POST /auth/login (post-MFA), and
// POST /auth/switch-role all return — confirmed against the backend's own
// documented worked example, not guessed. Hand-written because the OpenAPI
// generator the project once had (openapi-typescript, removed 2026-10-20)
// produced a bare Record<string, never> for AuthController_me — that
// endpoint's Swagger decoration documents no response DTO, so the generated
// type was empty and unusable.
export interface CurrentUser extends Address {
  id: number
  email: string
  firstName: string
  lastName: string
  // Same field as User.avatarUrl (see users/types.ts). Worth knowing here
  // specifically: this object is cached for the whole tab's life and
  // never refetched, so after 24 hours this URL can be expired. UserAvatar
  // falls back to initials when that happens.
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
  mfaEnabled: boolean
  roles: string[]
  activeRole: string
  // Nullable, not optional (`| null`, not `?`) — matches how avatarUrl is
  // already modeled above. The distinction matters: an optional key (`?`)
  // means the backend might not even send the property; `| null` means
  // the property is always present, but its value might genuinely be
  // absent. phone (and every Address field) are real, always-selected DB
  // columns on every user row (nullable at the schema level) — the key is
  // always there, its value just might be null. Modeling it as optional
  // here would let code get away with skipping a null-check, on the false
  // assumption a missing key and a null value can't both happen.
  phone: string | null
  // Always present: a NOT NULL column with a default ('kg') on the
  // backend, so every account has one. Drives the unit weights are shown
  // in, and the unit pre-selected when typing a new weight — read it
  // through usePreferredWeightUnit(), not from here directly.
  preferredWeightUnit: WeightUnit
  // "Email me about new messages" (roadmap Phase 6.5): NOT NULL, on by
  // default. Shown in the Settings menu to accounts that message (a
  // practitioner or a patient).
  messageEmailNotices: boolean
  // "Easier-to-read font" (decisions §39, pass 3): on the ACCOUNT, so it
  // follows the person to every device. NOT NULL, off by default. Applied
  // by useAccountFont() — the Settings menu changes it through
  // useSetReadableFont().
  readableFont: boolean
  // Present ONLY if the account actually holds that role — a multi-role
  // account can have more than one of these at once, which is exactly why
  // they're optional, nested, named sub-objects rather than flattened
  // top-level fields that would only sometimes exist.
  practitionerProfile?: {
    licenseNumber: string
    specialties: string[]
    // Same nullable-not-optional reasoning as phone/address above: bio is
    // a real column on every practitioner row, just possibly empty.
    bio: string | null
  }
  patientProfile?: { dateOfBirth: string }
  adminProfile?: { position: string | null }
  // The clinics this account belongs to. /auth/me has always sent it (the
  // same attachProfile() as GET /users/:id), but nothing read it until the
  // patient roster (2026-10-08), which needs "MY clinics": to offer the
  // clinic filter, to show which clinics I share with each patient, and to
  // list the clinics I may invite a patient into. (GET /clinics is no use
  // for that: for a practitioner it lists EVERY active clinic.)
  clinics: { id: number; name: string }[]
}

// The real shape POST /auth/register-clinic returns — same generated-type
// gap CurrentUser above already closed for /auth/me, for the identical
// reason: Nest's Swagger module can't introspect a plain-object-literal
// controller return without an explicit @ApiResponse decorator, so the
// generator (since removed) produced AuthController_registerClinic's
// response as an empty, unusable Record<string, never>.
//
// CurrentUser & { clinicId: number } is confirmed correct two ways, not
// just assumed: (1) reading auth.service.ts's registerClinic() — it builds
// its result by spreading the same attachProfile()/toPublic() helpers every
// other CurrentUser-shaped response goes through, plus one extra field,
// clinicId: clinic.id; and (2) an actual test run against that service
// method confirmed columns like phone/address/mfaEnabled genuinely survive
// into the result at runtime, even though auth.service.ts's OWN internal
// RegisterClinicResult interface doesn't bother listing them — a TypeScript
// interface only constrains what the compiler checks, it can never strip a
// real property off an object at runtime, so that narrower backend-internal
// type isn't actually a narrower real response. CurrentUser is the accurate
// model here, not a guess.
export type RegisterClinicResult = CurrentUser & { clinicId: number }
// GET /auth/setup-status — hand-written for the same generated-type gap as
// the two types above (a plain object literal returned by the controller).
// One field: has the one-time setup (register-clinic) already happened?
export interface SetupStatus {
  setupComplete: boolean
}