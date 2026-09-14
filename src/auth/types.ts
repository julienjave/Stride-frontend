// The real shape GET /auth/me, POST /auth/login (post-MFA), and
// POST /auth/switch-role all return — confirmed against the backend's own
// documented worked example, not guessed. Notably NOT the same as what
// openapi-typescript generated for AuthController_me (a bare
// Record<string, never>) — that endpoint's Swagger decoration doesn't
// document a response DTO, so the generated type was empty/unusable. We
// hand-write this instead, matching the backend's own docs, rather than
// relying on that generated (currently empty) type for this one endpoint.
export interface CurrentUser {
  id: number
  email: string
  firstName: string
  lastName: string
  avatarPath: string | null
  isActive: boolean
  createdAt: string
  mfaEnabled: boolean
  roles: string[]
  activeRole: string
  // Nullable, not optional (`| null`, not `?`) — matches how avatarPath is
  // already modeled above. The distinction matters: an optional key (`?`)
  // means the backend might not even send the property; `| null` means
  // the property is always present, but its value might genuinely be
  // absent. phone/address are real, always-selected DB columns on every
  // user row (nullable at the schema level) — the key is always there,
  // its value just might be null. Modeling it as optional here would let
  // code get away with skipping a null-check, on the false assumption a
  // missing key and a null value can't both happen.
  phone: string | null
  address: string | null
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
}
