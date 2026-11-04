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

import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { rememberSignedInUser, returnState } from '@/auth/returnPath'

export function RequireAuth() {
  const { data: user } = useCurrentUser()
  const location = useLocation()

  // Who is signed in, remembered OUTSIDE the cache: when they sign out the
  // cache says `null`, and the redirect below must still be able to say
  // whose page it was (returnPath.ts). An effect, not a write during
  // render: rendering stays pure.
  useEffect(() => {
    if (user) rememberSignedInUser(user.id)
  }, [user])


  if (!user) {
    // state.from is read by LoginPage after a successful login, so someone
    // who tried to visit e.g. /admin directly while logged out lands back
    // on /admin afterward — not always dumped at the dashboard regardless
    // of where they were actually headed. Storing pathname + search (a
    // plain string) rather than the whole location OBJECT keeps this
    // simple and matches exactly what the mid-session 401 handler (in
    // app/routes.tsx, outside React entirely) can produce too — one
    // shared shape, from two different trigger points.
    //
    // With its OWNER (decisions §39's live testing): the page belongs to
    // whoever was signed in — the next person to sign in on this browser
    // goes to their own home instead (returnPath.ts).
    return (
      <Navigate
        to="/login"
        replace
        state={returnState(location.pathname + location.search)}
      />
    )
  }

  return <Outlet />
}