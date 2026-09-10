import { z } from 'zod'

// Mirrors the backend's LoginDto (see types.generated.ts's components.schemas.LoginDto)
// — email + password required, role optional (only needed for a multi-role
// account telling the backend which role to log in as). Matching the
// backend's own shape here isn't just tidiness: catching an obviously
// invalid email client-side gives instant feedback, without waiting on a
// round trip just to learn what a quick local check could tell you first.
// The backend remains the REAL enforcement either way — this is UX, not a
// security boundary.
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

// z.infer derives a TypeScript type directly FROM the schema, rather than
// hand-writing an interface that could drift out of sync with it. One
// definition of "what a valid login looks like," not two.
export type LoginFormValues = z.infer<typeof loginSchema>

export const mfaCodeSchema = z.object({
  code: z
    .string()
    .length(6, 'Enter the 6-digit code')
    .regex(/^\d+$/, 'Code must be numbers only'),
})

export type MfaCodeFormValues = z.infer<typeof mfaCodeSchema>