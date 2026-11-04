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

import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { WeightUnit } from '@/common/weight'
import { updateUser, userQueryKey } from '@/users/api'
import type { CurrentUser } from './types'
import { currentUserQueryKey } from './useCurrentUser'
import { showFailure } from '@/snackbars/snackbarStore'
import { settingFailureText } from './settingFailureText'

// Changes the logged-in user's weight unit — OPTIMISTICALLY: the new unit
// is written into the cache the instant it's picked, before the server
// has answered, and put back if the server refuses.
//
// Why optimistic here, when every other save in the app waits for the
// server? Because of how this control is used. It's a menu item: picking
// it closes the menu at once, and there's no "Saving…" state anywhere to
// look at. Waiting would show the OLD unit ticked for a moment after
// choosing the new one, which reads as "it didn't work". And the risk is
// tiny: two valid values, a request that can only fail for technical
// reasons, and nothing lost if it does (just pick again).
//
// Lives in the Settings menu COMPONENT (always mounted in the header), not
// inside the dropdown's content — the content unmounts when the menu
// closes, which is right after a pick. A mutation owned by an unmounted
// component still runs, but its component can't show its state anymore.
//
// Shared by the key and the scope below. A constant, for the same reason
// as currentUserQueryKey: one spelling, no typo creating a second one.
const preferredWeightUnitMutationKey = ['preferred-weight-unit'] as const

export function useSetPreferredWeightUnit() {
  const queryClient = useQueryClient()

  // The unit the SERVER is known to hold — what the screen goes back to
  // if saving fails. A ref, not state: it's bookkeeping read inside the
  // mutation callbacks, never shown, so changing it must not re-render.
  // (Refs may be read and written freely in callbacks — only reading them
  // DURING render is off limits.)
  const confirmedUnit = useRef<WeightUnit | undefined>(undefined)

  // How many picks are still unfinished — including the one whose
  // callback is running (it only counts as finished once its callbacks
  // are done). Queued picks waiting for their turn count too.
  const pendingPicks = () => queryClient.isMutating({ mutationKey: preferredWeightUnitMutationKey })

  // Writes one field into the cached current user, leaving everything
  // else (activeRole, name…) as it is. Used both to apply and to undo.
  function setCachedUnit(unit: WeightUnit) {
    queryClient.setQueryData<CurrentUser | null>(currentUserQueryKey, (current) =>
      current ? { ...current, preferredWeightUnit: unit } : current,
    )
  }

  return useMutation({
    // The user id travels WITH each call (mutate({ userId, unit })) rather
    // than as a hook argument: the Settings menu calls this hook on every
    // render, including any render where the current user isn't known,
    // and hooks can't be skipped conditionally. By the time someone
    // actually picks a unit, the id is known.
    mutationFn: ({ userId, unit }: { userId: number; unit: WeightUnit }) =>
      updateUser(userId, { preferredWeightUnit: unit }),

    // Mutations sharing a scope id run ONE AT A TIME, in the order they
    // were started. Pick lbs then kg quickly, and the two PATCHes reach
    // the server in that order — so the server ends up with the LAST
    // choice, matching what the screen shows. Without it, both requests
    // are in flight at once, and whichever lands second wins.
    // (onMutate still runs immediately for each: only the requests queue.)
    mutationKey: preferredWeightUnitMutationKey,
    scope: { id: 'preferred-weight-unit' },

    // Runs before the request, the moment the unit is picked.
    onMutate: async ({ unit }) => {
      // The first pick of a burst: nothing else is in flight, so what the
      // cache shows right now is exactly what the server holds. Later picks
      // in the same burst don't overwrite it — the cache then only shows
      // an earlier, still-unconfirmed pick.
      //
      // This MUST come before the `await` below. Everything in an async
      // function up to its first `await` runs immediately, inside the
      // mutate() call itself; everything after runs later. Counted after
      // the await, three quick picks would ALL see "3 pending" (each
      // mutate() call has already started by then), and none would record
      // the confirmed unit. A test with a quick burst of picks caught
      // exactly that.
      if (pendingPicks() === 1) {
        confirmedUnit.current =
          queryClient.getQueryData<CurrentUser | null>(currentUserQueryKey)?.preferredWeightUnit
      }

      // No /auth/me request should be in flight when we write: if one
      // were, its (older) answer could land after our write and silently
      // undo it. This app never refetches /auth/me on its own, so this is
      // cheap insurance rather than a known problem — but it's the
      // standard first step of an optimistic update.
      await queryClient.cancelQueries({ queryKey: currentUserQueryKey })

      setCachedUnit(unit)
    },

    // The server accepted this pick: it's now the confirmed unit.
    //
    // The cached current user already shows it (onMutate). The PATCH
    // answer is the full updated user, which is exactly what the profile
    // page's own cache entry holds — refreshed so the two never disagree.
    onSuccess: (updated, { userId, unit }) => {
      confirmedUnit.current = unit
      queryClient.setQueryData(userQueryKey(userId), updated)
    },

    // Undo — but only when this was the LAST unfinished pick. If a newer
    // pick is still waiting, the screen already shows that newer choice
    // and its own request is about to settle the matter: undoing now
    // would briefly show a unit nobody chose.
    //
    // Why not simply "put back the unit from before this pick"? With only
    // two values, that goes wrong: kg → pick lbs → pick kg → pick lbs; if
    // the first pick fails, "before it" was kg, while the user's last
    // choice is lbs. The server-confirmed unit is the one value that's
    // always right to fall back to.
    onError: (error) => {
      if (pendingPicks() === 1 && confirmedUnit.current) {
        setCachedUnit(confirmedUnit.current)
      }
      // The menu closed with the pick: the failure is a snackbar (decisions
      // §33), which stays until closed. Every failing pick raises it; the
      // same sentence twice replaces the first (addSnackbar), so a burst of
      // failed picks still shows one.
      showFailure(settingFailureText('your weight unit', error))
    },
  })
}