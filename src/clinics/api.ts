import { apiRequest } from '@/api/client'
import type { Clinic, UpdateClinicPayload } from './types'
import type { CreateClinicFormValues } from './schemas'

// --- QUERY KEYS --------------------------------------------------------

// Same exported-constant convention as currentUserQueryKey (auth/
// useCurrentUser.ts) — a shared constant, not inlined at each call site,
// so every place that needs to invalidate or read the clinics list cache
// (the list page, and after create/update/deactivate mutations) references
// the exact same key, with no risk of a typo silently creating a second,
// disconnected cache entry.
export const clinicsQueryKey = ['clinics'] as const

// A FUNCTION, not a constant, because this key is parameterized by WHICH
// clinic — every clinic needs its own cache entry, so the key has to
// include the id. TanStack Query compares keys by deep value equality, so
// clinicQueryKey(3) called from two different components still resolves
// to the exact same cache entry, not two separate ones.
export function clinicQueryKey(id: number) {
  return ['clinics', id] as const
}

// --- QUERIES -----------------------------------------------------------

export function fetchClinics() {
  return apiRequest<Clinic[]>('/clinics')
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
  const { phone, address, website, ...rest } = values

  return apiRequest<Clinic>('/clinics', {
    method: 'POST',
    body: {
      ...rest,
      phone: phone === '' ? undefined : phone,
      address: address === '' ? undefined : address,
      website: website === '' ? undefined : website,
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