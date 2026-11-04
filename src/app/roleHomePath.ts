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

import type { UserRole } from '@/auth/schemas'

// The one place that knows "which role goes to which route." Both the `/`
// redirect (DashboardRedirect.tsx) and the post-role-switch navigation
// (RoleSwitcher.tsx) import this instead of hardcoding paths themselves —
// two callers agreeing to share one source of truth, rather than two
// copies of the same mapping that could quietly drift apart later.
//
// Typed as Record<UserRole, string> rather than a switch statement
// specifically so TypeScript enforces completeness: if UserRole ever
// gains a fourth value, this object literal fails to compile until a
// path is added for it. A switch would need an extra exhaustiveness
// trick to get the same guarantee for free.
const ROLE_HOME_PATHS: Record<UserRole, string> = {
  admin: '/admin',
  practitioner: '/practitioner',
  patient: '/patient',
}

export function roleHomePath(role: UserRole): string {
  return ROLE_HOME_PATHS[role]
}