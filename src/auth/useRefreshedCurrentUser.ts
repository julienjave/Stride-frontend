import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchCurrentUser } from './api'
import { currentUserQueryKey } from './useCurrentUser'

// Reads the signed-in account AGAIN when a page opens — for the pages whose
// form depends on a fact that can change on another device (2026-10-29):
// whether two-factor sign-in is on decides whether the email and password
// changes ask for a code, and which face the Two-factor page shows.
//
// Why it's needed: the current user is read ONCE, at start-up, and never
// refetched (useCurrentUser — `enabled: false`, `staleTime: Infinity`).
// Turning two-factor OFF on a laptop leaves the phone's tab signed in (only
// turning it ON signs the other devices out), still saying "on": its forms
// would demand a code the backend no longer asks — from an app entry the
// person may already have deleted. Read fresh, the form follows (react-hook-
// form reads its resolver anew on every render, so the code field and its
// rule appear or go with the answer).
//
// How: `fetchQuery` with `staleTime: 0` asks the server whatever the cache
// holds, and writes the answer into the SAME cache entry every
// useCurrentUser() reads — so the header, the profile row and this page all
// agree at once. (An invalidation wouldn't do: a disabled query isn't
// refetched by one — ConfirmEmailPage's lesson.) In an effect, once per
// opening: a read the page doesn't wait for (the cached answer shows
// meanwhile; a page a few milliseconds behind is harmless — the backend
// checks the code rule anyway). A failure keeps what the cache had: a 401
// (the session ended) is already the app's global handler's — off to
// sign-in. Twice at once (React's StrictMode runs effects twice in
// development) is still ONE request: TanStack Query shares a fetch already
// in flight for the same key.
export function useRefreshedCurrentUser(): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    void queryClient
      .fetchQuery({ queryKey: currentUserQueryKey, queryFn: fetchCurrentUser, staleTime: 0 })
      .catch(() => undefined)
  }, [queryClient])
}