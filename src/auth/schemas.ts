import { z } from 'zod'


// --- LOGIN -----------------------------------------------------------------

// Matches the backend's UserRole enum exactly (see CreateUserDto's role
// field in types.generated.ts) — reused both for validating the login
// form's optional role field AND for rendering the role-picker's buttons,
// so there's one definition of "what a valid role even is," not two.
export const userRoleSchema = z.enum(['admin', 'practitioner', 'patient'])
export type UserRole = z.infer<typeof userRoleSchema>

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  role: userRoleSchema.optional(),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be numbers only'),
})

export type MfaCodeFormValues = z.infer<typeof mfaCodeSchema>


// --- SELF-REGISTRATION ------------------------------------------------------

// Matches RegisterDto (email, password, firstName, lastName, dateOfBirth)
// PLUS one field the backend knows nothing about: confirmPassword. This is
// purely a client-side UX check — catching a typo'd password before a
// round trip, not something we ever send to the backend (see api.ts's
// register() function, which strips it out before calling apiRequest).
export const registerSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    // Mirrors the backend's actual constraint (RegisterDto: 8–128 chars) —
    // catching a too-short password here is instant feedback instead of a
    // round trip just to learn the same thing.
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    // Both genuinely optional, per RegisterDto — .optional() means the KEY
    // may be absent from the parsed result, but note this does NOT stop an
    // untouched form input from producing an empty string '' here: RHF
    // reads whatever's currently in the DOM, and an empty text input's
    // value is '', not undefined. z.string() (with no .min()) happily
    // accepts '' as valid — so Zod alone can't tell "left blank" apart
    // from "typed then deleted." That distinction is handled one layer up,
    // in api.ts's register(), right before the request is sent — see the
    // comment there for why it matters.
    phone: z.string().max(50, 'Phone number is too long').optional(),
    address: z.string().max(500, 'Address is too long').optional(),
  })
  // .refine runs AFTER the per-field checks above all pass — this is for a
  // check that depends on MORE THAN ONE field at once, which a single
  // field's own validator can't express. `path: ['confirmPassword']`
  // controls which field the resulting error attaches to (so it renders
  // under the confirm-password input, not floating unattached).
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type RegisterFormValues = z.infer<typeof registerSchema>