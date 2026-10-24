import type { AuditAction, AuditKind } from './types'

// What each action is called on screen (the person's choice, 2026-10-22: a
// hand-written phrase rather than words made from the constant). Short, in
// the past tense, without names — the entry shows who acted and whom it is
// about on a line of its own.
//
// `Record<AuditAction, string>`: TypeScript requires a phrase for EVERY
// action in the union (types.ts) and refuses any key that isn't one — the
// table can't silently miss an action or keep a misspelt one.
const WORDING: Record<AuditAction, string> = {
  // Sign-in and account security
  REGISTER_CLINIC: 'Set up Stride (first clinic and admin)',
  LOGIN_SUCCESS: 'Signed in',
  LOGIN_FAILURE: 'Failed to sign in',
  LOGIN_BLOCKED_DEACTIVATED: 'Tried to sign in to a deactivated account',
  MFA_LOGIN_FAILURE: 'Entered a wrong two-factor code',
  LOGOUT: 'Signed out',
  ROLE_SWITCHED: 'Switched role',
  MFA_SETUP_STARTED: 'Started setting up two-factor sign-in',
  MFA_ENABLED: 'Turned on two-factor sign-in',
  MFA_DISABLED: 'Turned off two-factor sign-in',
  MFA_RECOVERY_CODE_USED: 'Signed in with a recovery code',
  // A change asked for the password (and a code) again, and got a wrong one
  // (decisions §16); the details say which change, why, the failures in a
  // row — and "Signed out" on the 5th.
  STEP_UP_FAILED: 'Entered a wrong password or code to confirm a change',
  MFA_RECOVERY_CODES_REGENERATED: 'Made new two-factor recovery codes',
  MFA_RESET_BY_ADMIN: 'Reset two-factor sign-in for an account',
  PASSWORD_RESET_REQUESTED: 'Asked for a password reset link',
  PASSWORD_RESET_COMPLETED: 'Reset a password',
  PASSWORD_CHANGED: 'Changed a password',
  EMAIL_CHANGE_REQUESTED: 'Asked to change a sign-in email',
  EMAIL_CHANGE_CONFIRMED: 'Changed a sign-in email',
  EMAIL_CHANGE_CANCELLED: 'Cancelled a change of sign-in email',

  // Accounts
  USER_CREATED: 'Created an account',
  USER_UPDATED: 'Changed account details',
  USER_ROLE_GRANTED: 'Gave an account another role',
  USER_AVATAR_CHANGED: 'Changed a profile photo',
  USER_AVATAR_REMOVED: 'Removed a profile photo',
  USER_DEACTIVATED: 'Deactivated an account',
  USER_REACTIVATED: 'Reactivated an account',

  // Invitations
  INVITATION_SENT: 'Sent an invitation',
  INVITATION_RESENT: 'Sent a new invitation',
  INVITATION_REVOKED: 'Revoked an invitation',
  INVITATION_ACCEPTED: 'Accepted an invitation',

  // Care teams
  CARE_TEAM_JOINED: 'Joined a care team',
  CARE_TEAM_MEMBER_ADDED: 'Added a colleague to a care team',
  CARE_TEAM_ENDED: 'Ended a place on a care team',

  // Clinics
  CLINIC_CREATED: 'Created a clinic',
  CLINIC_UPDATED: 'Changed clinic details',
  CLINIC_LOGO_CHANGED: 'Changed a clinic logo',
  CLINIC_LOGO_REMOVED: 'Removed a clinic logo',
  CLINIC_MEMBER_ADDED: 'Added someone to a clinic',
  CLINIC_MEMBER_REMOVED: 'Removed someone from a clinic',
  CLINIC_DEACTIVATED: 'Deactivated a clinic',
  CLINIC_REACTIVATED: 'Reactivated a clinic',

  // Exercise library
  EXERCISE_CREATED: 'Created a library exercise',
  EXERCISE_UPDATED: 'Edited a library exercise',
  EXERCISE_ARCHIVED: 'Archived a library exercise',
  EXERCISE_PHOTOS_ADDED: 'Added photos to a library exercise',
  EXERCISE_PHOTOS_REORDERED: 'Reordered a library exercise’s photos',
  EXERCISE_PHOTO_REMOVED: 'Removed a photo from a library exercise',

  // Templates
  TEMPLATE_CREATED: 'Created a template',
  TEMPLATE_DUPLICATED: 'Duplicated a template',
  TEMPLATE_UPDATED: 'Edited a template',
  TEMPLATE_ARCHIVED: 'Archived a template',
  TEMPLATE_WORKOUT_ADDED: 'Added a workout to a template',
  TEMPLATE_WORKOUT_RENAMED: 'Renamed a template workout',
  TEMPLATE_WORKOUT_REMOVED: 'Removed a workout from a template',
  TEMPLATE_WORKOUTS_REORDERED: 'Reordered a template’s workouts',
  TEMPLATE_EXERCISE_ADDED: 'Added an exercise to a template',
  TEMPLATE_EXERCISE_UPDATED: 'Edited a template exercise',
  TEMPLATE_EXERCISE_REMOVED: 'Removed an exercise from a template',
  TEMPLATE_EXERCISES_REORDERED: 'Reordered a template’s exercises',

  // Programs
  ASSIGNED_PROGRAM_CREATED: 'Assigned a program',
  ASSIGNED_PROGRAM_UPDATED: 'Edited a program',
  ASSIGNED_PROGRAM_SCHEDULE_SET: 'Changed a program’s schedule',
  ASSIGNED_PROGRAM_CANCELLED: 'Cancelled a program',
  ASSIGNED_PROGRAM_COMPLETED: 'Completed a program',
  ASSIGNED_PROGRAM_ARCHIVED: 'Deleted a program (archived)',
  ASSIGNED_PROGRAM_WORKOUT_ADDED: 'Added a workout to a program',
  ASSIGNED_PROGRAM_WORKOUT_RENAMED: 'Renamed a program workout',
  ASSIGNED_PROGRAM_WORKOUT_REMOVED: 'Removed a workout from a program',
  ASSIGNED_PROGRAM_WORKOUTS_REORDERED: 'Reordered a program’s workouts',
  ASSIGNED_PROGRAM_EXERCISE_ADDED: 'Added an exercise to a program',
  ASSIGNED_PROGRAM_EXERCISE_UPDATED: 'Edited a program exercise',
  ASSIGNED_PROGRAM_EXERCISE_REMOVED: 'Removed an exercise from a program',
  ASSIGNED_PROGRAM_EXERCISE_RETIRED: 'Retired a program exercise',
  ASSIGNED_PROGRAM_EXERCISES_REORDERED: 'Reordered a program’s exercises',
  ASSIGNED_PROGRAM_EXERCISE_PHOTOS_ADDED: 'Added photos to a program exercise',
  ASSIGNED_PROGRAM_EXERCISE_PHOTOS_REORDERED: 'Reordered a program exercise’s photos',
  ASSIGNED_PROGRAM_EXERCISE_PHOTO_REMOVED: 'Removed a photo from a program exercise',
  PROGRAMS_VIEWED: 'Viewed the program list',
  PROGRAM_VIEWED: 'Viewed a program',
  PROGRAM_SUMMARY_VIEWED: 'Viewed a program’s progress',
  PROGRAM_SESSIONS_VIEWED: 'Viewed a program’s sessions',
  PROGRAM_CLOSING_PREVIEWED: 'Previewed closing a program',

  // Sessions
  SESSION_STARTED: 'Started a session',
  SESSION_UPDATED: 'Answered a session’s pain check-in',
  SESSION_EXERCISE_UPDATED: 'Updated an exercise in a session',
  SESSION_COMPLETED: 'Finished a session',
  SESSION_STOPPED: 'Stopped a session',
  SESSION_SKIPPED: 'Skipped a session',
  SESSION_VIEWED: 'Viewed a session',

  // The practitioners' "For review" list
  SESSION_REVIEWED: 'Marked a session as reviewed',
  PROGRAM_ALERT_REVIEWED: 'Marked a program alert as reviewed',
  ALERTS_VIEWED: 'Viewed the For review list',

  // Messaging (who wrote to whom and when — never the text)
  CONVERSATION_STARTED: 'Started a conversation',
  MESSAGE_SENT: 'Sent a message',
  MESSAGE_DELETED: 'Deleted a message',
  CONVERSATION_READ: 'Read new messages',
  CONVERSATION_ARCHIVED: 'Archived a conversation',
  CONVERSATION_UNARCHIVED: 'Unarchived a conversation',

  // Medical files (entry ids — never the notes)
  MEDICAL_FILE_ENTRY_CREATED: 'Added a medical file entry',
  MEDICAL_FILE_ENTRY_AMENDED: 'Amended a medical file entry',
  MEDICAL_FILE_VIEWED: 'Viewed a medical file',
  MEDICAL_FILE_ENTRY_VIEWED: 'Viewed a medical file entry',
}

// `Object.hasOwn`, not `in`: `'toString' in WORDING` is true (inherited).
function isWordedAction(action: string): action is AuditAction {
  return Object.hasOwn(WORDING, action)
}

// An action's words. One the table doesn't know — an old row, or an action
// the backend added since this file was written — is still shown: an
// ACTION_NAME becomes "Action name"; anything else (the old generic
// interceptor wrote "POST /users/6") is shown exactly as stored.
export function actionLabel(action: string): string {
  if (isWordedAction(action)) return WORDING[action]
  if (!/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/.test(action)) return action
  const words = action.toLowerCase().replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// The badge on each entry, and the Kind filter's choices.
export const KIND_LABEL: Record<AuditKind, string> = {
  change: 'Change',
  view: 'View',
  sign_in: 'Sign-in',
}

// When an entry was written, to the minute, in the viewer's language and
// time zone ("21 Oct 2026, 14:02"). `locale` and `timeZone` are for tests:
// the page passes neither.
export function formatEntryMoment(value: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(
    new Date(value),
  )
}

// A calendar DAY in the same style ("10 Mar 2031") — a program's start or
// end date, a "today" sent with a request. A day has no time zone: it is
// read and written in UTC, so "2031-03-10" is the 10th in Montreal too
// (read as local time it would become the 9th there). The same technique as
// formatCalendarDate, in the entries' shorter style.
export function formatEntryDay(value: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${value}T00:00:00Z`),
  )
}