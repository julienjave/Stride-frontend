import { useLayoutEffect } from 'react'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { ApiError } from '@/api/client'
import { applyReadableFont, writeStoredReadableFont } from './font'

// The "Easier-to-read font" follows the ACCOUNT (design decisions §39,
// pass 3): its value comes from the signed-in user (`readableFont`, a users
// column), never from whoever used this browser before.
//
// Called once, by App, high in the tree — like the current user's own
// bootstrap — so it runs on every page, signed in or not:
//   - someone is signed in → their setting is applied, and COPIED to this
//     device (localStorage), so that on the next page load index.html's
//     pre-paint script can draw the first frame in the right font, before
//     React and the network are there;
//   - nobody is signed in → the default font, and the copy REMOVED. Two
//     ways of knowing it: the cached user is `null` (signed out in this
//     tab), or the bootstrap's /auth/me answered 401 (a session that
//     expired, or was ended elsewhere — useCurrentUser then holds an ERROR,
//     not `null`). The
//     sign-in page is in Geist, and nothing on this computer says that the
//     last person needed the easier font — the leak found in live testing
//     of pass 2 (Morgan's setting reaching Alex).
//   - not known yet (/auth/me still in flight, or it failed for want of a
//     network or with a server error) → nothing is touched: the pre-paint script's
//     copy stays, and it belongs to the person whose session cookie this
//     browser still holds.
//
// useLayoutEffect, as for the theme: the class changes before the browser
// paints, so no frame is drawn in the old letters.
export function useAccountFont(): void {
  const { data: user, error } = useCurrentUser()
  // The bootstrap's /auth/me refused: nobody is signed in on this page load.
  const sessionRefused = error instanceof ApiError && error.statusCode === 401

  useLayoutEffect(() => {
    // Not known yet — nothing to say.
    if (user === undefined && !sessionRefused) return
    // A user → their setting; `null` (signed out) or a refused session →
    // the default.
    const readable = user?.readableFont ?? false
    applyReadableFont(readable)
    writeStoredReadableFont(readable)
  }, [user, sessionRefused])
}
