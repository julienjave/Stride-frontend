import { z } from 'zod'

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