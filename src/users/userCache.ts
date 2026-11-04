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

import type { QueryClient } from '@tanstack/react-query'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { CurrentUser } from '@/auth/types'
import { userQueryKey } from './api'
import type { User } from './types'

// What "this user just changed on the server" means for the cache. Every
// route that returns the full updated User calls this with the response:
// PATCH /users/:id (useSaveUser) and the avatar upload/remove
// (AvatarUpload). One function, so a new cached copy of a user only has to
// be added here to be kept up to date everywhere.
//
// A plain function taking the QueryClient, not a hook: it's called from
// inside mutation code (after an `await`, or in a mutation's onSuccess),
// where hooks can't be called. The caller gets the client from
// useQueryClient() and passes it in.
export function applyUpdatedUser(queryClient: QueryClient, updated: User) {
  // 1. This user's own entry — what useUser(id) reads, so the page shows
  //    the change immediately. The response IS the full new user, so
  //    writing it is correct and saves a GET.
  queryClient.setQueryData(userQueryKey(updated.id), updated)

  // 2. Every cached users list (names, emails shown in rows) — marked
  //    stale, refetched the next time a list is shown. A prefix match on
  //    'users-list' covers both variants (active-only, include-inactive)
  //    and, thanks to the separate top-level key, never touches entry 1.
  void queryClient.invalidateQueries({ queryKey: ['users-list'] })
  // The clinic directory search shows names, photos and dates of birth too
  // (the practitioner's "Add patient" page): a patient edited on their page
  // must not keep their old name there for the next 30 seconds. Added
  // 2026-10-08 with the patient page, the first place a practitioner edits
  // someone who also appears in the directory.
  void queryClient.invalidateQueries({ queryKey: ['directory-patients'] })

  // 3. The logged-in user, IF that's who just changed. The header (account
  //    menu: name, avatar) reads this entry (the /auth/me data), a
  //    DIFFERENT entry from 1 — without this, renaming yourself or
  //    changing your photo would leave the old one in the header until
  //    the next full reload.
  //
  //    The updater function receives the current cached value; returning
  //    it unchanged (someone else was edited) leaves the cache as it is.
  //
  //    The ORDER of the spread matters: `current` first, then `updated`
  //    on top. Every field the response carries replaces the old one, and
  //    any key the response DOESN'T carry is kept from `current` — in
  //    particular `activeRole`: the response describes the user, not the
  //    session, so it has none. Writing `updated` alone would erase the
  //    active role (and the header's "· Practitioner").
  queryClient.setQueryData<CurrentUser | null>(currentUserQueryKey, (current) =>
    current && current.id === updated.id ? { ...current, ...updated } : current,
  )
}