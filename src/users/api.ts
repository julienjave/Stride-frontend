import { apiRequest } from '@/api/client'
import type { User } from './types'
import type { CreateUserFormValues } from './schemas'

// --- QUERY KEYS --------------------------------------------------------

// Same convention as clinics/api.ts: a plain exported constant for the
// list, a function for the parameterized detail entry.
export const usersQueryKey = ['users'] as const

export function userQueryKey(id: number) {
  return ['users', id] as const
}

// --- QUERIES -------------------------------------------------------------

// GET /users — admin sees every account, a practitioner sees only their
// own patients (the backend branches on activeRole; this function doesn't
// need to know which, it just calls the one route either way).
export function fetchUsers() {
  return apiRequest<User[]>('/users')
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
  const { role, phone, address, licenseNumber, specialties, bio, dateOfBirth, position, clinicId, ...rest } =
    values

  return apiRequest<User>('/users', {
    method: 'POST',
    body: {
      ...rest,
      role,
      phone: emptyToUndefined(phone),
      address: emptyToUndefined(address),

      // Only the fields relevant to the SELECTED role get sent — not
      // because the backend would reject the others (CreateUserDto's
      // @ValidateIf just skips validating an irrelevant field, it doesn't
      // forbid it being present), but because sending fields that don't
      // apply to this role is just confusing to read in a network log or
      // test fixture for no benefit.
      ...(role === 'practitioner' && {
        licenseNumber,
        // The form collects this as one comma-separated text input, not
        // a real multi-value control — split, trim each piece, and drop
        // any empty strings a trailing/double comma would otherwise leave
        // behind (e.g. "Sports, , Pediatrics," → ["Sports", "Pediatrics"]).
        specialties: specialties
          ? specialties
              .split(',')
              .map((specialty) => specialty.trim())
              .filter((specialty) => specialty !== '')
          : undefined,
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