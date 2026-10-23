import { z } from 'zod'

// "Step-up": the forms that could hand the account to someone else ask the
// CURRENT password again, even though the person is signed in — changing the
// sign-in email (decisions §12) and changing the password (§13). The
// backend's rule lives in one place (src/common/current-password.ts); its
// refusal is mirrored here once, so both forms recognise it the same way.

export const WRONG_PASSWORD_MESSAGE = 'Your current password is not correct'

// Sent exactly as typed — never trimmed: spaces may be part of a password.
export const currentPasswordField = z.string().min(1, 'Enter your current password')