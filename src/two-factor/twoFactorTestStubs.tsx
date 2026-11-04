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

import { useCurrentUser } from '@/auth/useCurrentUser'
import { useUser } from '@/users/useUser'
import { TwoFactorRow } from './TwoFactorRow'

// The profile page, reduced to what the two-factor tests look at: its heading
// and the real Two-factor row (the confirmation is a snackbar, checked in the
// store — decisions §33) — fed like the real profile: from GET /users/:id (useUser), not from the current user (to see "On"/"Off"
// follow what the page did — the browser found the page told only the
// current user). Alone in its file: a module
// exporting a component exports only components (react-refresh lint rule).
export function ProfileStub() {
  const { data: me } = useCurrentUser()
  return (
    <div>
      <h1>My profile</h1>
      {me && <ProfileRow userId={me.id} />}
    </div>
  )
}

function ProfileRow({ userId }: { userId: number }) {
  const { data: user } = useUser(userId)
  return user ? <TwoFactorRow mfaEnabled={user.mfaEnabled} /> : null
}