/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

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
