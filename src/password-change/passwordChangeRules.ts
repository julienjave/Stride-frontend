import { z } from 'zod'
import { newPasswordSchema } from '@/auth/newPasswordSchema'
import { currentPasswordField } from '@/auth/currentPassword'

// The pure rules of the change-of-password page (decisions §13): where it
// lives, the form's checks, the backend's words it must recognise, and the
// line the profile shows afterwards.

export const CHANGE_PASSWORD_PATH = '/profile/password'

// The backend's own words (src/password-change/password-change.service.ts):
// a new password equal to the current one. Mirrored so the page can say it
// at the NEW password's field. (A wrong current password:
// WRONG_PASSWORD_MESSAGE, auth/currentPassword.ts.)
export const SAME_PASSWORD_MESSAGE = 'Your new password must be different from your current one'

// Handed to the profile through navigation state (readNotice). "Any other
// devices": true whether there were some or none.
export const PASSWORD_CHANGED_NOTICE =
  'Your password is changed. Any other devices signed in to your account are signed out.'

// The form: the current password, then the new one twice — the SAME rule as
// every page that sets a password (newPasswordSchema: 8–128 characters, the
// two copies equal), plus "not the current one", checked here too so the
// person learns it before a request is sent (the backend checks it again).
//
// `safeExtend`, not `extend`: newPasswordSchema carries a refinement ("the
// two copies match"), and in Zod 4 `.extend()` refuses a refined object —
// extending could silently drop the check. `safeExtend` adds the field and
// keeps the refinement.
export const changePasswordSchema = newPasswordSchema
  .safeExtend({ currentPassword: currentPasswordField })
  .refine((values) => values.password !== values.currentPassword, {
    message: SAME_PASSWORD_MESSAGE,
    path: ['password'],
  })
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>