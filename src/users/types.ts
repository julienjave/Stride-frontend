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
export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  avatarPath: string | null
  phone: string | null
  address: string | null
  isActive: boolean
  createdAt: string
  mfaEnabled: boolean
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
}