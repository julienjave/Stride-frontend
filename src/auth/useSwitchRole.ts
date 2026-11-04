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

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { switchRole } from './api'
import { currentUserQueryKey } from './useCurrentUser'

// This is a hazard: "a user who
// switches from practitioner to admin will briefly see stale, wrongly-
// scoped cached data" unless every role-scoped query gets invalidated at
// the moment of switching — not just the current-user record itself.
export function useSwitchRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: switchRole,
    onSuccess: (user) => {
      // Two steps, in this order:
      //
      // 1. REMOVE every cached query EXCEPT the current user's. No
      //    role-scoped data (a patient roster, a library filtered for the
      //    old role) may survive the switch.
      //
      // 2. UPDATE the current-user entry IN PLACE with the fresh object
      //    this response already gave us — no refetch needed.
      //
      // Why not simply queryClient.clear() and then setQueryData (the
      // previous version)? Because of how components watch the cache: a
      // component calling useCurrentUser() is subscribed to one specific
      // Query OBJECT in the cache, not to the key in the abstract.
      // clear() throws that object away; setQueryData then creates a NEW
      // object under the same key, which the watching components know
      // nothing about. They stayed stuck on the discarded object — still
      // showing the OLD role — until something happened to re-render them.
      // That was the "header keeps showing Practitioner after switching"
      // bug: the only thing that had been re-rendering them was the
      // post-switch navigation, and when that got lost too, nothing did.
      // (useSwitchRole.test.tsx reproduces it with a watching component.)
      //
      // Keeping the current-user Query object alive and only updating its
      // DATA means setQueryData notifies everyone subscribed to it, right
      // away, whatever else happens. As a bonus there's never a moment
      // where the current user is missing from the cache at all.
      const currentUserQuery = queryClient
        .getQueryCache()
        .find({ queryKey: currentUserQueryKey, exact: true })
      queryClient.removeQueries({
        predicate: (query) => query !== currentUserQuery,
      })
      queryClient.setQueryData(currentUserQueryKey, user)
    },
  })
}