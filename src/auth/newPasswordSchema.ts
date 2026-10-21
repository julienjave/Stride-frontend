import { z } from 'zod'

// Choosing a password, typed twice — the ONE rule for every page that sets
// one: accepting an invitation (the first password) and resetting a
// forgotten one (Phase 6). Mirrors the backend's DTOs (AcceptInvitationDto,
// ResetPasswordDto: 8–128 characters) for instant feedback — the backend
// still checks it. Same messages as the register-clinic form, so a password
// rule reads the same everywhere. (Moved here from invitations/schemas.ts
// when the reset page became its second user, 2026-10-21.)
export const newPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
  })
  // A refine on the whole object, not on one field, because the rule
  // involves two fields. `path` attaches the message to confirmPassword,
  // so it shows under that field.
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>