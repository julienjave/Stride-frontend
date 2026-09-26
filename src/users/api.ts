import { apiRequest } from '@/api/client'
import { toAddressPayload } from '@/common/address/api'
import type { UpdateUserPayload, User } from './types'
import type { CreateUserFormValues, GrantRoleFormValues } from './schemas'

// --- QUERY KEYS --------------------------------------------------------

// Same convention as clinics/api.ts: a plain exported constant for the
// list, a function for the parameterized detail entry.
// Distinct top-level key from userQueryKey(id) below (['users', id]) —
// deliberately 'users-list', not 'users'. That separation matters here
// specifically: invalidating every cached LIST variant after a
// deactivate/reactivate (there are two: active-only and include-
// inactive) needs a PREFIX match across both, which would otherwise also
// sweep up individual userQueryKey(id) entries if they shared the same
// top-level key — the exact prefix-matching gotcha this app already hit
// once with invalidateQueries on clinics (see clinics/useSaveClinic.ts).
export function usersListQueryKey(includeInactive = false) {
  return ['users-list', includeInactive] as const
}

export function userQueryKey(id: number) {
  return ['users', id] as const
}

// --- QUERIES -------------------------------------------------------------

// GET /users — admin sees every account, a practitioner sees only their
// own patients (the backend branches on activeRole; this function doesn't
// need to know which, it just calls the one route either way).
// includeInactive is admin-only in effect (the backend ignores it entirely
// for a practitioner caller — findPatientsForPractitioner takes no such
// option), but the query string itself is harmless to send regardless.
export function fetchUsers(includeInactive = false) {
  return apiRequest<User[]>(`/users${includeInactive ? '?includeInactive=true' : ''}`)
}

export function fetchUser(id: number) {
  return apiRequest<User>(`/users/${id}`)
}

// --- MUTATIONS -----------------------------------------------------------

// Same '' → undefined story as createClinic() in clinics/api.ts: an
// untouched optional text input reads as '' from the DOM, and
// CreateUserDto's @IsOptional() fields only treat undefined as genuinely
// absent — an empty string would sail through validation and get stored
// as a literal empty value.
function emptyToUndefined(value: string | undefined) {
  return value === '' ? undefined : value
}

export function createUser(values: CreateUserFormValues) {
  const {
    role,
    phone,
    addressLine1,
    addressLine2,
    addressCity,
    addressState,
    addressPostalCode,
    addressCountry,
    licenseNumber,
    specialties,
    bio,
    dateOfBirth,
    position,
    clinicId,
    ...rest
  } = values

  return apiRequest<User>('/users', {
    method: 'POST',
    body: {
      ...rest,
      role,
      phone: emptyToUndefined(phone),
      ...toAddressPayload({
        addressLine1,
        addressLine2,
        addressCity,
        addressState,
        addressPostalCode,
        addressCountry,
      }),

      // Only the fields relevant to the SELECTED role get sent — not
      // because the backend would reject the others (CreateUserDto's
      // @ValidateIf just skips validating an irrelevant field, it doesn't
      // forbid it being present), but because sending fields that don't
      // apply to this role is just confusing to read in a network log or
      // test fixture for no benefit.
      ...(role === 'practitioner' && {
        licenseNumber,
        // Already a clean list — the form's schema (tagDraftSchema) did
        // the trimming, checking and adding of leftover text. `undefined`
        // when the box was never touched, so JSON.stringify leaves it out;
        // [] if tags were added then removed, which the backend stores
        // exactly like its default (an empty list).
        specialties,
        bio: emptyToUndefined(bio),
      }),
      ...(role === 'patient' && { dateOfBirth }),
      ...(role === 'admin' && { position: emptyToUndefined(position) }),

      // clinicId arrives as a string (or '') from the <select> — see
      // schemas.ts's comment on why HTML form controls can't carry a
      // real number. Number('') is 0, not NaN, which is exactly why this
      // checks for an empty string explicitly rather than trusting
      // Number(clinicId) || undefined (0 is falsy too, but a real clinic
      // could coincidentally... it can't, ids start at 1, but relying on
      // that fact would be fragile — checking the string directly isn't).
      clinicId: clinicId ? Number(clinicId) : undefined,
    },
  })
}

// POST /users/:id/roles returns a plain string[] (getRolesForUser's own
// return shape — confirmed by reading UsersService.grantRole/
// getRolesForUser directly, not guessed) — not a full User. That's too
// thin to usefully write into the user's cache entry directly (no
// profile data, no clinics), so the caller is expected to invalidate
// userQueryKey(userId) afterward instead, same reasoning as
// addClinicMember/removeClinicMember in clinics/api.ts.
export function grantRole(userId: number, values: GrantRoleFormValues) {
  const { role, licenseNumber, specialties, bio, dateOfBirth, position } = values

  return apiRequest<string[]>(`/users/${userId}/roles`, {
    method: 'POST',
    body: {
      role,
      ...(role === 'practitioner' && {
        licenseNumber,
        // Same as createUser above.
        specialties,
        bio: emptyToUndefined(bio),
      }),
      ...(role === 'patient' && { dateOfBirth }),
      ...(role === 'admin' && { position: emptyToUndefined(position) }),
    },
  })
}

// DELETE /users/:id is a soft delete (UsersService.softDelete() only ever
// issues an UPDATE ... SET isActive = false, same as deactivateClinic())
// — it returns the full updated User, roles/profile/clinics included, so
// (unlike grantRole/addClinicMember/removeClinicMember above) the caller
// CAN write this response straight into the cache with setQueryData
// rather than needing to invalidate and refetch.
export function deactivateUser(id: number) {
  return apiRequest<User>(`/users/${id}`, { method: 'DELETE' })
}

// Admin-only, enforced server-side (@Roles(UserRole.ADMIN) on the
// controller route) — no self-service or managing-practitioner path,
// unlike deactivateUser above. Returns the full reactivated User, same
// "the response IS the full authoritative state" shape as deactivateUser.
export function reactivateUser(id: number) {
  return apiRequest<User>(`/users/${id}/reactivate`, { method: 'POST' })
}

// PATCH /users/:id — used by every per-field editor on the profile page
// and the admin's user page. Returns the full updated User (roles, profile
// sections and clinics included — UsersService.update() ends with the
// same attachProfile() call as GET /users/:id), so callers write the
// response straight into the cache instead of fetching again. See
// useSaveUser.ts for exactly which cache entries that touches.
export function updateUser(id: number, payload: UpdateUserPayload) {
  return apiRequest<User>(`/users/${id}`, { method: 'PATCH', body: payload })
}