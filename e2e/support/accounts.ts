// The seeded accounts the suite signs in as (the backend's
// docs/dev-test-accounts.md — `seed:dev` makes them on every run).
export const PASSWORD = 'password123'

export const ACCOUNTS = {
  admin: 'admin@stride.test',
  alex: 'alex@stride.test',
  pat: 'pat@stride.test',
  // Two roles (practitioner + admin): the sign-in asks which one.
  morgan: 'morgan@stride.test',
} as const

export type AccountName = keyof typeof ACCOUNTS

// Where e2e/auth.setup.ts saves each account's session cookie, and where
// tests load it from (`test.use({ storageState: stateFile('alex') })`). In
// .gitignore: a session cookie is a credential, even a demo one.
export function stateFile(account: AccountName): string {
  return `e2e/.auth/${account}.json`
}
