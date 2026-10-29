import { ApiError } from '@/api/client'
import type { ClinicRef, DirectoryPatient } from '@/patients/types'

// "A patient with this name and date of birth may already be in Stride"
// (decisions §27, pass 2). Creating a patient — or granting the patient
// role — answers 409 with `reason: 'possible_duplicate'` when an existing
// patient has the same date of birth and the same name (written
// differently, or swapped). It's a WARNING: sent again with
// `allowPossibleDuplicate: true`, the request goes ahead.
//
// What the 409 carries depends on who asked (the backend decides —
// UsersService.possibleDuplicateRefusal):
//   - a practitioner: the matches their clinic directory would show, as
//     directory rows (`inYourClinics`), and whether OTHER matches exist
//     (`elsewhere`) — nothing about those;
//   - an admin: every match (`matches`), with its clinics and whether the
//     account is active.
// The same route also answers 409 for an email already taken — without a
// reason. So the reason, not the status, is what tells them apart.

export const POSSIBLE_DUPLICATE_REASON = 'possible_duplicate'

export interface PractitionerDuplicateWarning {
  inYourClinics: DirectoryPatient[]
  elsewhere: boolean
}

export interface AdminDuplicateMatch {
  id: number
  firstName: string
  lastName: string
  isActive: boolean
  clinics: ClinicRef[]
}

function duplicateBody(error: unknown) {
  return error instanceof ApiError &&
    error.statusCode === 409 &&
    error.body.reason === POSSIBLE_DUPLICATE_REASON
    ? error.body
    : null
}

// The warning a practitioner was given, or null for any other outcome. The
// body is the server's, typed `unknown` per key: each field is checked for
// its shape before it's trusted (an array, a boolean) — a body missing one
// reads as "nothing to show" there rather than crashing the page.
export function practitionerDuplicateWarning(
  error: unknown,
): PractitionerDuplicateWarning | null {
  const body = duplicateBody(error)
  if (!body) return null
  return {
    inYourClinics: Array.isArray(body.inYourClinics)
      ? (body.inYourClinics as DirectoryPatient[])
      : [],
    elsewhere: body.elsewhere === true,
  }
}

export function adminDuplicateMatches(error: unknown): AdminDuplicateMatch[] | null {
  const body = duplicateBody(error)
  if (!body) return null
  return Array.isArray(body.matches) ? (body.matches as AdminDuplicateMatch[]) : []
}

// --- Words ---

export const POSSIBLE_DUPLICATE_HEADING = 'This patient may already be in Stride'

export const POSSIBLE_DUPLICATE_TEXT =
  'A patient with the same name and date of birth already has an account. Two accounts for one ' +
  "person would split their record in two — the programs, sessions and notes on each wouldn't " +
  'be seen together.'

// A practitioner learns only THAT another match exists — never who or where.
// "also" only when matches from their clinics are listed above it.
export function duplicateElsewhereText(alsoInYourClinics: boolean): string {
  const which = alsoInYourClinics
    ? "There is also a match you can't see"
    : "You can't see the existing account"
  return (
    `${which}: it's at a clinic you don't work at, or it has been deactivated. Check with an ` +
    'admin before inviting — they can give you access to it, or reactivate it.'
  )
}

export const DUPLICATE_IN_YOUR_CLINICS_TEXT =
  'In your clinics — if this is them, add them to your patients instead of inviting:'

// An admin can see every account: open them, compare, decide.
export const ADMIN_DUPLICATE_TEXT =
  'Open each account to compare. If it is the same person, use the existing account instead of ' +
  'making another.'

export function goAheadLabel(action: string, firstName: string, lastName: string) {
  return `${action} ${firstName} ${lastName} anyway`
}