// The audit log as the backend answers it (GET /audit-logs and GET
// /audit-logs/actions, admins only). Hand-written like every response type
// in the app — the backend's `AuditLogView` (src/audit/audit.service.ts).

// - change:  something was created, changed or removed;
// - view:    someone else's clinical data was read;
// - sign_in: an account signed in, failed to, signed out or switched role.
export const AUDIT_KINDS = ['change', 'view', 'sign_in'] as const
export type AuditKind = (typeof AUDIT_KINDS)[number]

// Every action the backend writes TODAY — a mirror of the keys of its
// AUDIT_ACTIONS (src/audit/audit-vocabulary.ts). It exists so the wording
// table (auditWording.ts) can be typed `Record<AuditAction, string>`: a
// phrase missing for one of these is a compile error. A stored action NOT
// in this list (an old row, or one the backend added since) is still shown
// — `AuditLogEntry.action` is a plain string — with words made from its
// name (`actionLabel`).
export type AuditAction =
  | 'REGISTER_CLINIC'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_BLOCKED_DEACTIVATED'
  | 'MFA_LOGIN_FAILURE'
  | 'LOGOUT'
  | 'ROLE_SWITCHED'
  | 'MFA_SETUP_STARTED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_RECOVERY_CODE_USED'
  | 'STEP_UP_FAILED'
  | 'MFA_RECOVERY_CODES_REGENERATED'
  | 'MFA_RESET_BY_ADMIN'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGE_REQUESTED'
  | 'EMAIL_CHANGE_CONFIRMED'
  | 'EMAIL_CHANGE_CANCELLED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ROLE_GRANTED'
  | 'USER_AVATAR_CHANGED'
  | 'USER_AVATAR_REMOVED'
  | 'USER_DEACTIVATED'
  | 'USER_REACTIVATED'
  | 'INVITATION_SENT'
  | 'INVITATION_RESENT'
  | 'INVITATION_REVOKED'
  | 'INVITATION_ACCEPTED'
  | 'CARE_TEAM_JOINED'
  | 'CARE_TEAM_MEMBER_ADDED'
  | 'CARE_TEAM_ENDED'
  | 'CLINIC_CREATED'
  | 'CLINIC_UPDATED'
  | 'CLINIC_LOGO_CHANGED'
  | 'CLINIC_LOGO_REMOVED'
  | 'CLINIC_MEMBER_ADDED'
  | 'CLINIC_MEMBER_REMOVED'
  | 'CLINIC_DEACTIVATED'
  | 'CLINIC_REACTIVATED'
  | 'EXERCISE_CREATED'
  | 'EXERCISE_UPDATED'
  | 'EXERCISE_ARCHIVED'
  | 'EXERCISE_PHOTOS_ADDED'
  | 'EXERCISE_PHOTOS_REORDERED'
  | 'EXERCISE_PHOTO_REMOVED'
  | 'TEMPLATE_CREATED'
  | 'TEMPLATE_DUPLICATED'
  | 'TEMPLATE_UPDATED'
  | 'TEMPLATE_ARCHIVED'
  | 'TEMPLATE_WORKOUT_ADDED'
  | 'TEMPLATE_WORKOUT_RENAMED'
  | 'TEMPLATE_WORKOUT_REMOVED'
  | 'TEMPLATE_WORKOUTS_REORDERED'
  | 'TEMPLATE_EXERCISE_ADDED'
  | 'TEMPLATE_EXERCISE_UPDATED'
  | 'TEMPLATE_EXERCISE_REMOVED'
  | 'TEMPLATE_EXERCISES_REORDERED'
  | 'ASSIGNED_PROGRAM_CREATED'
  | 'ASSIGNED_PROGRAM_UPDATED'
  | 'ASSIGNED_PROGRAM_SCHEDULE_SET'
  | 'ASSIGNED_PROGRAM_CANCELLED'
  | 'ASSIGNED_PROGRAM_COMPLETED'
  | 'ASSIGNED_PROGRAM_ARCHIVED'
  | 'ASSIGNED_PROGRAM_WORKOUT_ADDED'
  | 'ASSIGNED_PROGRAM_WORKOUT_RENAMED'
  | 'ASSIGNED_PROGRAM_WORKOUT_REMOVED'
  | 'ASSIGNED_PROGRAM_WORKOUTS_REORDERED'
  | 'ASSIGNED_PROGRAM_EXERCISE_ADDED'
  | 'ASSIGNED_PROGRAM_EXERCISE_UPDATED'
  | 'ASSIGNED_PROGRAM_EXERCISE_REMOVED'
  | 'ASSIGNED_PROGRAM_EXERCISE_RETIRED'
  | 'ASSIGNED_PROGRAM_EXERCISES_REORDERED'
  | 'ASSIGNED_PROGRAM_EXERCISE_PHOTOS_ADDED'
  | 'ASSIGNED_PROGRAM_EXERCISE_PHOTOS_REORDERED'
  | 'ASSIGNED_PROGRAM_EXERCISE_PHOTO_REMOVED'
  | 'PROGRAMS_VIEWED'
  | 'PROGRAM_VIEWED'
  | 'PROGRAM_SUMMARY_VIEWED'
  | 'PROGRAM_SESSIONS_VIEWED'
  | 'PROGRAM_CLOSING_PREVIEWED'
  | 'SESSION_STARTED'
  | 'SESSION_UPDATED'
  | 'SESSION_EXERCISE_UPDATED'
  | 'SESSION_COMPLETED'
  | 'SESSION_STOPPED'
  | 'SESSION_SKIPPED'
  | 'SESSION_VIEWED'
  | 'SESSION_REVIEWED'
  | 'PROGRAM_ALERT_REVIEWED'
  | 'CARE_TEAM_JOIN_REVIEWED'
  | 'COMPLAINT_REVIEW_NOTICE_REVIEWED'
  | 'ALERTS_VIEWED'
  | 'CONVERSATION_STARTED'
  | 'MESSAGE_SENT'
  | 'MESSAGE_DELETED'
  | 'CONVERSATION_READ'
  | 'CONVERSATION_ARCHIVED'
  | 'CONVERSATION_UNARCHIVED'
  | 'MESSAGES_VIEWED'
  | 'MEDICAL_FILE_ENTRY_CREATED'
  | 'MEDICAL_FILE_ENTRY_AMENDED'
  | 'MEDICAL_FILE_VIEWED'
  | 'MEDICAL_FILE_ENTRY_VIEWED'
  | 'RECORDS_EXPORTED'
  | 'RECORDS_EXPORT_LINK_SENT'
  | 'RECORDS_EXPORT_LINK_REFUSED'
  | 'COMPLAINT_REVIEW_OPENED'
  | 'COMPLAINT_REVIEW_ENDED'
  | 'LEGAL_DISCLOSURE_MADE'
  | 'LEGAL_DISCLOSURE_NOTICE_REVIEWED'
  | 'PATIENT_MERGED'
  | 'PATIENT_MERGE_RECORDS_MOVED'
  | 'PATIENT_MERGE_NOTICE_REVIEWED'

export interface AuditPerson {
  id: number
  firstName: string
  lastName: string
}

export interface AuditLogEntry {
  id: number
  action: string
  kind: AuditKind
  // As stored ('assigned-programs', 'medical_files'…) and as read ('Programs').
  entityType: string
  area: string
  entityId: number | null
  // Its shape depends on the action — see auditDetails.ts. null when
  // withheld (below).
  details: unknown
  // True for an entry about clinical data — a program, a session, a message,
  // a medical file (the backend's CLINICAL_AREAS, decisions §16): the details
  // stay in the database, but admins — the audit log's only readers — read
  // no clinical data, so the answer leaves them out and says so.
  detailsWithheld: boolean
  createdAt: string
  // Who acted, and whom the entry is about (null: about no one — a library
  // change, a sign-in event of some kinds).
  performer: AuditPerson
  target: AuditPerson | null
}

export interface AuditLogPage {
  data: AuditLogEntry[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface AuditActionOption {
  action: string
  kind: AuditKind
}