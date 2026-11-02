import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUser, userQueryKey } from '@/users/api'
import { fetchCurrentUser } from './api'
import type { CurrentUser } from './types'
import { currentUserQueryKey } from './useCurrentUser'
import { showFailure } from '@/snackbars/snackbarStore'
import { settingFailureText } from './settingFailureText'

// Turns the "Easier-to-read font" on or off for the ACCOUNT (decisions §39,
// pass 3) — from the Settings menu. The same shape as
// useSetMessageEmailNotices, its neighbour in that menu, for the same
// reasons:
//   - OPTIMISTIC: the cached current user changes at once, so the page
//     redraws in the new font the moment the box is ticked (useAccountFont
//     applies whatever the cached user says) — the request follows;
//   - `scope`: quick clicks are sent one at a time, in order, so the server
//     ends with the last one;
//   - on a failure, a snackbar with the reason, and the truth ASKED again
//     (/auth/me) rather than guessed — which also puts the font back.
export function useSetReadableFont() {
  const queryClient = useQueryClient()

  function setCached(readable: boolean) {
    queryClient.setQueryData<CurrentUser | null>(currentUserQueryKey, (current) =>
      current ? { ...current, readableFont: readable } : current,
    )
  }

  return useMutation({
    mutationFn: ({ userId, readable }: { userId: number; readable: boolean }) =>
      updateUser(userId, { readableFont: readable }),
    scope: { id: 'readable-font' },
    onMutate: async ({ readable }) => {
      // An /auth/me answer in flight could land after this and undo it.
      await queryClient.cancelQueries({ queryKey: currentUserQueryKey })
      setCached(readable)
    },
    // The PATCH answers with the whole user: the profile page's own entry
    // is refreshed with it, as for the other settings.
    onSuccess: (updated, { userId }) => {
      queryClient.setQueryData(userQueryKey(userId), updated)
    },
    onError: (error) => {
      showFailure(settingFailureText('your font setting', error))
      void queryClient.prefetchQuery({
        queryKey: currentUserQueryKey,
        queryFn: fetchCurrentUser,
        staleTime: 0,
      })
    },
  })
}