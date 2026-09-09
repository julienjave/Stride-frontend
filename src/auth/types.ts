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
  // Present ONLY if the account actually holds that role — a multi-role
  // account can have more than one of these at once, which is exactly why
  // they're optional, nested, named sub-objects rather than flattened
  // top-level fields that would only sometimes exist.
  practitionerProfile?: { licenseNumber: string; specialties: string[] }
  patientProfile?: { dateOfBirth: string }
  adminProfile?: { position: string | null }
}