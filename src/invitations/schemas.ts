import { z } from 'zod'

// The accept page's form: the person's first password, typed twice.
// Mirrors AcceptInvitationDto's own rule (8–128 characters) for instant
// feedback — the backend still checks it. Same messages as the
// register-clinic form, so a password rule reads the same everywhere.
export const acceptInvitationSchema = z
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

export type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>