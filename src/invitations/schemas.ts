// The accept page's form: the person's first password, typed twice — the
// shared rule for choosing a password (auth/newPasswordSchema.ts, also used
// by the reset page). Kept under the invitation's own name, so the accept
// page and its tests read as before.
export {
  newPasswordSchema as acceptInvitationSchema,
  type NewPasswordFormValues as AcceptInvitationFormValues,
} from '@/auth/newPasswordSchema'