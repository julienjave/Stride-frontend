import { isProgramOpen } from './permissions'
import type { AssignedProgram } from './types'

// Why a program can't be changed right now, or null when it can (decisions
// §22, 2026-10-27). Two reasons, and the backend refuses both with a 409:
//   - 'closed': the program is completed, cancelled or deleted — for good
//     (to continue it, "Assign again");
//   - 'patient_deactivated': the program is open, but its patient's account
//     is deactivated — until an admin reactivates it. Closing the program
//     (complete / cancel) is still allowed: it ends something.
// 'closed' wins when both are true, as on the backend: reactivating the
// account wouldn't make a closed program changeable.
//
// `patientActive` is undefined while the patient isn't loaded yet (or
// couldn't be): the program then counts as changeable — the usual case
// draws at once, and if the guess is wrong the backend's 409 still stands
// behind every button. Waiting instead would hide the controls on every
// visit until a second request answers.
export type ProgramLock = 'closed' | 'patient_deactivated' | null

export function programLock(
  program: Pick<AssignedProgram, 'status' | 'isArchived'>,
  patientActive: boolean | undefined,
): ProgramLock {
  if (!isProgramOpen(program)) return 'closed'
  if (patientActive === false) return 'patient_deactivated'
  return null
}

// The sentences for 'patient_deactivated', one per page (each page already
// has its own words for 'closed'). They say what can't happen, until when,
// and who can change that — a practitioner can't reactivate an account.
export const DEACTIVATED_PROGRAM_TEXT =
  "This patient's account is deactivated, so this program can't change until an admin reactivates it. You can still complete or cancel it."
export const DEACTIVATED_EXERCISE_TEXT =
  "This patient's account is deactivated: the program's exercises can't change until an admin reactivates it."
export const DEACTIVATED_PHOTOS_TEXT =
  "This patient's account is deactivated: these photos can't change until an admin reactivates it."
export const DEACTIVATED_ADD_EXERCISE_TEXT =
  "This patient's account is deactivated: no exercise can be added until an admin reactivates it."
export const DEACTIVATED_ASSIGN_AGAIN_TEXT =
  "This patient's account is deactivated: the program can be assigned again once an admin reactivates it."