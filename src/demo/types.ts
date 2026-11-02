import type { DemoReset } from './demoReset'

// GET /auth/setup-status's `demo` (decisions §46) — the backend's
// src/demo/demo-info.ts, by hand like every response type.

export interface DemoCardAccount {
  email: string
  // The role the account signs in as (it has exactly that one).
  role: 'admin' | 'practitioner' | 'patient'
  // Signing in asks for a two-factor code after the password.
  twoFactor: boolean
}

export interface DemoInfo {
  accounts: DemoCardAccount[]
  // The one password of every shared account — public on purpose.
  password: string
  // The two-factor account's authenticator key — public on purpose too.
  twoFactorKey: string
  reset: DemoReset | null
  // https:// only (the backend refuses anything else at start).
  guideUrl: string | null
}
