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

// The real shape GET /clinics and GET /clinics/:id return — confirmed
// directly against src/database/schema/clinics.schema.ts, column by
// column, rather than trusted from the generated OpenAPI types (which
// don't even attempt a shape here — ClinicsController_findOne/_findAll's
// responses generate as bare `content?: never`, since neither route has
// an explicit @ApiResponse decorator for Nest's Swagger module to read).
//
// Nullable-vs-optional convention, same one CurrentUser already
// established: phone/website/logoUrl (and every Address field) are real,
// always-present fields that simply allow an absent value — so `| null`,
// not `?`. The key is always present in the JSON response; only the
// value is sometimes empty. id/name/email/isActive are NOT NULL columns,
// so they're modeled as plain required fields with no null case to
// represent at all.
//
// logoUrl is NOT a database column — the backend never sends back
// `logoPath` (the internal RustFS object key it actually stores). Every
// clinic-returning endpoint computes a fresh, ready-to-load, temporary
// presigned URL from that key server-side and sends THAT instead. This
// matters for one practical reason: the URL expires (24 hours server-side)
// — it's meant to be used more or less immediately (e.g. `<img src=...>`),
// not stored, compared across requests, or assumed stable. `null` means
// "this clinic has no logo uploaded," not "the URL failed to generate."
export interface Clinic extends Address {
  id: number
  name: string
  email: string
  phone: string | null
  website: string | null
  logoUrl: string | null
  isActive: boolean
}

// The real shape PATCH /clinics/:id accepts — UpdateClinicDto came out as
// Record<string, never> from the OpenAPI generator (since removed), the same
// PartialType(CreateClinicDto)-loses-Swagger-metadata gap RegisterClinicResult
// already worked around elsewhere. Confirmed by reading create-clinic.dto.ts
// and update-clinic.dto.ts directly: UpdateClinicDto really is just
// CreateClinicDto's fields, all optional.
//
// phone/website/every Address field are typed `string | null` here, NOT
// `string`, even though the backend's own DTO types them as plain
// optional strings (e.g. `phone?: string`). This is deliberate, not a
// mismatch: class-validator's @IsOptional() treats an explicit `null`
// exactly like an absent key (both skip validation), so sending `null`
// is accepted even though the DTO's TypeScript type doesn't spell out
// that case. This type describes what the edit UI is actually allowed to
// DO (send null to deliberately clear a field), which is a real, working
// capability the DTO's declared type just doesn't bother naming.
export type UpdateClinicPayload = Partial<
  Address & {
    name: string
    email: string
    phone: string | null
    website: string | null
  }
>