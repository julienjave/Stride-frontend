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

import { apiRequest } from '@/api/client'
import { toAddressPayload } from '@/common/address/api'
import type { Clinic, UpdateClinicPayload } from './types'
import type { CreateClinicFormValues } from './schemas'

// --- QUERY KEYS --------------------------------------------------------

// Distinct top-level key from clinicQueryKey below (['clinics', id]) —
// deliberately 'clinics-list', not 'clinics'. Mirrors usersListQueryKey's
// reasoning exactly: invalidating every cached LIST variant (active-only
// and include-inactive) after a deactivate/reactivate needs a PREFIX
// match across both, which would otherwise also sweep up individual
// clinicQueryKey(id) entries if they shared the same top-level key.
export function clinicsListQueryKey(includeInactive = false) {
  return ['clinics-list', includeInactive] as const
}

// A FUNCTION, not a constant, because this key is parameterized by WHICH
// clinic — every clinic needs its own cache entry, so the key has to
// include the id. TanStack Query compares keys by deep value equality, so
// clinicQueryKey(3) called from two different components still resolves
// to the exact same cache entry, not two separate ones.
export function clinicQueryKey(id: number) {
  return ['clinics', id] as const
}

// --- QUERIES -----------------------------------------------------------

// includeInactive is admin-only in effect (findAll() only honors it for
// an admin caller server-side), but sending the query string is harmless
// regardless of who's asking.
export function fetchClinics(includeInactive = false) {
  return apiRequest<Clinic[]>(`/clinics${includeInactive ? '?includeInactive=true' : ''}`)
}

export function fetchClinic(id: number) {
  return apiRequest<Clinic>(`/clinics/${id}`)
}

// --- MUTATIONS ---------------------------------------------------------

// Same '' → undefined story as registerClinic() in auth/api.ts, for the
// identical reason: an untouched optional input reads as '' from the DOM,
// and CreateClinicDto's @IsOptional() only treats undefined/null as
// genuinely absent — an empty string would sail through validation and
// land as a literal empty value in the database.
export function createClinic(values: CreateClinicFormValues) {
  const {
    phone,
    website,
    addressLine1,
    addressLine2,
    addressCity,
    addressState,
    addressPostalCode,
    addressCountry,
    ...rest
  } = values

  return apiRequest<Clinic>('/clinics', {
    method: 'POST',
    body: {
      ...rest,
      phone: phone === '' ? undefined : phone,
      website: website === '' ? undefined : website,
      ...toAddressPayload({
        addressLine1,
        addressLine2,
        addressCity,
        addressState,
        addressPostalCode,
        addressCountry,
      }),
    },
  })
}

// Deliberately takes an already-built UpdateClinicPayload, rather than
// destructuring a raw form-values object the way createClinic() does
// above. There's no '' → undefined conversion to perform here, because
// there's no untouched-vs-cleared ambiguity left to resolve at this
// layer — the caller (the edit view, built in a later piece) has ALREADY
// decided, per field, whether to send a real value or an explicit `null`
// to deliberately clear it (see UpdateClinicPayload's own comment in
// types.ts for why `null` is the right signal there). This function's
// only job is to send exactly what it's given.
export function updateClinic(id: number, payload: UpdateClinicPayload) {
  return apiRequest<Clinic>(`/clinics/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

// DELETE /clinics/:id is a soft delete (ClinicsService.deactivate() only
// ever issues an UPDATE — see deferred-improvements.md for the missing
// reactivate route) — it returns the now-inactive clinic row, not a 204,
// so this is typed the same way the other clinic-returning calls are.
export function deactivateClinic(id: number) {
  return apiRequest<Clinic>(`/clinics/${id}`, { method: 'DELETE' })
}

// Admin-only, enforced server-side — mirrors reactivateUser's shape
// exactly. Returns the full reactivated Clinic.
export function reactivateClinic(id: number) {
  return apiRequest<Clinic>(`/clinics/${id}/reactivate`, { method: 'POST' })
}

// FormData is built here, not passed in as a raw File — this is the ONE
// place that needs to know the multipart field name the backend expects.
// POST /clinics/:id/logo reads it via @UseInterceptors(FileInterceptor
// ('file', ...)) — 'file' has to match EXACTLY, on both sides, since
// Multer identifies which part of the multipart body is the upload by
// this field name, not by position or content type.
export function uploadClinicLogo(id: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest<Clinic>(`/clinics/${id}/logo`, {
    method: 'POST',
    body: formData,
  })
}

// Idempotent on the backend — calling this on a clinic with no logo just
// returns it unchanged, so there's nothing special this function needs
// to do to handle that case itself.
export function removeClinicLogo(id: number) {
  return apiRequest<Clinic>(`/clinics/${id}/logo`, { method: 'DELETE' })
}

// These two live HERE, not in users/api.ts, even though the UI that
// calls them (a user's own edit page, letting an admin add/remove that
// user's clinic memberships) lives in the users feature folder. The
// organizing principle throughout this app has been "which backend
// controller does this call," not "which page happens to use it" — these
// hit POST/DELETE /clinics/:id/members, clinics' own routes, the exact
// same way uploadClinicLogo above does for /clinics/:id/logo.

// The backend's own response here is just the raw membership row
// ({ id, clinicId, userId }) — not a full Clinic or the affected User,
// so there's nothing meaningful to setQueryData with directly. The
// caller is expected to invalidate that user's own cache entry
// (userQueryKey(userId)) afterward, so the next read pulls the real,
// authoritative clinics list (with names) from GET /users/:id — the
// same "the mutation response doesn't carry a name, so don't try to
// hand-build one" reasoning as any read-after-write case where the
// write's own response is a thinner shape than what the UI displays.
export function addClinicMember(clinicId: number, userId: number) {
  return apiRequest<{ id: number; clinicId: number; userId: number }>(
    `/clinics/${clinicId}/members`,
    { method: 'POST', body: { userId } },
  )
}

// DELETE here returns no body at all (removeMember() has no return
// statement on the backend) — apiRequest's empty-body handling covers
// this the same way it already does for logout/mfa-enable/etc.
export function removeClinicMember(clinicId: number, userId: number) {
  return apiRequest<void>(`/clinics/${clinicId}/members/${userId}`, {
    method: 'DELETE',
  })
}