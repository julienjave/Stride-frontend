import type { Address } from '@/common/address/types'
import type { WeightUnit } from '@/common/weight'

// The real shape POST /users, GET /users, and GET /users/:id all return —
// confirmed directly against users.service.ts's toPublic() and
// attachProfile() helpers, not trusted from the generated OpenAPI types.
// Same gap as before: UsersController_create's response generates as a
// bare Record<string, never>, since the controller has no explicit
// @ApiResponse decorator for Nest's Swagger module to read.
//
// This deliberately mirrors CurrentUser (auth/types.ts) almost exactly —
// both ultimately come from the same toPublic()/attachProfile() pair on
// the backend. They're kept as two separate types rather than merged into
// one shared base, for two reasons: CurrentUser carries `activeRole`,
// a concept that only makes sense for "the person currently logged in,"
// not for an arbitrary OTHER user being viewed/managed; and auth/ and
// users/ are separate feature folders mirroring separate backend modules
// (this project's established structure), so reaching across that
// boundary to share a base type is a bigger refactor than this feature
// needs — a small, acknowledged duplication is the lower-risk choice here.
//
// avatarPath stays a raw internal storage key for now, NOT a presigned
// URL — unlike Clinic.logoUrl, this hasn't been converted yet. That's a
// deliberate, separate, later piece of work (see the roadmap's Phase 6
// avatar-upload item), not an oversight here.
export interface User extends Address {
  id: number
  email: string
  firstName: string
  lastName: string
  avatarPath: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  mfaEnabled: boolean
  preferredWeightUnit: WeightUnit
  // Every role this account currently holds — a multi-role account (e.g.
  // an admin who is also a treating practitioner) can have more than one.
  roles: string[]
  // Present ONLY when `roles` includes the matching role — same
  // conditional-nested-object convention as CurrentUser, for the same
  // reason: a flattened set of top-level fields would exist ambiguously
  // (is `licenseNumber: undefined` "not a practitioner" or "a
  // practitioner who left it blank"?).
  practitionerProfile?: {
    licenseNumber: string
    specialties: string[]
    bio: string | null
  }
  patientProfile?: { dateOfBirth: string }
  adminProfile?: { position: string | null }
  // Every clinic this user currently belongs to — always an array, never
  // absent, same "nullable/empty is a real value, not a missing field"
  // reasoning as `roles` above. A user can belong to several clinics at
  // once (and move between them over time) — see the backend's
  // attachProfile()/attachProfilesToMany(), which join user_clinics ->
  // clinics and group by userId rather than assuming one-clinic-per-user.
  clinics: { id: number; name: string }[]
}

// The body of PATCH /users/:id — mirrors the backend's UpdateUserDto.
// Every key is optional (a PATCH sends only what changed), but the VALUE
// types differ on purpose, following what the database allows:
//   - NOT NULL columns (names, licenseNumber, specialties, dateOfBirth)
//     take a real value only. There's no way to "clear" them, and the
//     backend answers null with a 400.
//   - Nullable columns (phone, bio, position, every address field) also
//     accept `null`, which is how a field is cleared. Sending '' instead
//     would store an empty string — "we have a phone number and it's
//     blank" — rather than "no phone number".
// Email is deliberately absent: it can't be changed through this route
// (design decisions §4 — its own flow, later).
export interface UpdateUserPayload {
  firstName?: string
  lastName?: string
  phone?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressPostalCode?: string | null
  addressCountry?: string | null
  licenseNumber?: string
  specialties?: string[]
  bio?: string | null
  dateOfBirth?: string
  position?: string | null
  // NOT NULL (always 'kg' or 'lbs'), so never null. Only the user
  // themselves may send it — the backend answers anyone else with a 403.
  preferredWeightUnit?: WeightUnit
}