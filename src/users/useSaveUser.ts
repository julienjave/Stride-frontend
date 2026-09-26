import { useQueryClient } from '@tanstack/react-query'
import { updateUser } from './api'
import { applyUpdatedUser } from './userCache'
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
//
// Which cache entries that touches, and why, is in userCache.ts — shared
// with the avatar upload, which changes the same user in the same ways.
export function useSaveUser(userId: number) {
  const queryClient = useQueryClient()

  return async (payload: UpdateUserPayload) => {
    const updated = await updateUser(userId, payload)
    applyUpdatedUser(queryClient, updated)
    return updated
  }
}