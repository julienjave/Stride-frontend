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

import { Navigate, Outlet } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import type { UserRole } from '@/auth/schemas'

interface RequireRoleProps {
  allowedRoles: UserRole[]
}

// IMPORTANT: this is a UX convenience,
// NOT a security boundary. It exists purely to avoid showing someone a
// screen that would just immediately fail server-side anyway (e.g. a
// practitioner landing on an admin-only page and seeing broken/empty
// content). The backend's own @Roles(...) guards are the REAL enforcement
// — this component could be deleted entirely and no actual authorization
// hole would open up, since every real endpoint still checks for itself.
export function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { data: user } = useCurrentUser()

  // Defensive, not load-bearing: RequireRole is meant to be nested INSIDE
  // a RequireAuth-guarded branch of the route tree, so `user` should
  // already be guaranteed non-null by the time this runs. Checking again
  // costs nothing and protects against this component ever being used
  // standalone by mistake later.
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.activeRole as UserRole)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}