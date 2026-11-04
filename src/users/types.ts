/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import type { Address } from '@/common/address/types'
import type { WeightUnit } from '@/common/weight'
import type { CreatedUserInvitation } from '@/invitations/types'

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
export interface User extends Address {
  id: number
  email: string
  firstName: string
  lastName: string
  // A ready-to-load presigned image URL, or null when the user has no
  // photo — the same convention as Clinic.logoUrl. The backend never sends
  // the raw storage key (it converts it in UsersService.toPublic()). The
  // URL expires after 24 hours, which is why anything that displays it
  // must cope with it failing to load — see UserAvatar.
  avatarUrl: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  mfaEnabled: boolean
  preferredWeightUnit: WeightUnit
  messageEmailNotices: boolean
  // (No `readableFont` here: the "Easier-to-read font" is the person's own
  // setting, and the backend leaves it out of every answer about someone
  // else — decisions §41. The signed-in person's own copy is on
  // CurrentUser, auth/types.ts.)
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
  // Self-only too (roadmap Phase 6.5).
  messageEmailNotices?: boolean
  // Self-only too (decisions §39).
  readableFont?: boolean
}

// What POST /users returns: the new account, plus its first invitation —
// accounts are created without a password, and the person chooses theirs
// by accepting the emailed invitation.
export interface CreatedUser extends User {
  invitation: CreatedUserInvitation
}