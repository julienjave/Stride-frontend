import { useQueryClient } from '@tanstack/react-query'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { CurrentUser } from '@/auth/types'
import { updateUser, userQueryKey } from './api'
import type { UpdateUserPayload } from './types'

// Returns the function every profile field calls to save: send the PATCH,
// then bring every cached copy of this user up to date.
//
// Why a plain async function and not a useMutation hook: each field
// (EditableField, EditableTags, EditableAddress) already runs its OWN
// useMutation around whatever `save` it's given — that's what keeps each
// field's pending/error state independent. This hook supplies the "what
// saving a user means" part. And because the cache updates happen right
// after the `await`, inside the same function, they don't depend on any
// component still being on screen when the response arrives (unlike a
// per-call onSuccess — the role-switcher lesson).
export function useSaveUser(userId: number) {
  const queryClient = useQueryClient()

  return async (payload: UpdateUserPayload) => {
    const updated = await updateUser(userId, payload)

    // 1. This user's own entry — what useUser(userId) reads, so the page
    //    shows the saved value immediately. The PATCH response IS the full
    //    new user, so writing it is correct and saves a GET.
    queryClient.setQueryData(userQueryKey(userId), updated)

    // 2. Every cached users list (names, emails shown in rows) — marked
    //    stale, refetched the next time a list is shown. A prefix match on
    //    'users-list' covers both variants (active-only, include-inactive)
    //    and, thanks to the separate top-level key, never touches entry 1.
    void queryClient.invalidateQueries({ queryKey: ['users-list'] })

    // 3. The logged-in user, IF that's who was just edited. The account
    //    menu shows the name from this cache entry (the /auth/me data), a
    //    DIFFERENT entry from 1 — without this, renaming yourself would
    //    leave the old name in the header until the next full reload.
    //
    //    The updater function receives the current cached value; returning
    //    it unchanged (someone else was edited) leaves the cache as it is.
    //
    //    The ORDER of the spread matters: `current` first, then `updated`
    //    on top. Every field the response carries replaces the old one,
    //    and any key the response DOESN'T carry is kept from `current` —
    //    in particular `activeRole`: the PATCH response describes the
    //    user, not the session, so it has none. Writing `updated` alone
    //    would erase the active role (and the header's "· Practitioner").
    queryClient.setQueryData<CurrentUser | null>(currentUserQueryKey, (current) =>
      current && current.id === userId ? { ...current, ...updated } : current,
    )

    return updated
  }
}