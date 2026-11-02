import { useState } from 'react'
import { cn } from '@/lib/utils'
import { avatarTintClass } from './avatarTint'

interface UserAvatarProps {
  // Picks the circle's tint when there's no photo (avatarTint.ts): the
  // same person, the same colour, on every screen. Required like
  // avatarUrl, so no screen can forget it and draw everyone in one colour.
  userId: number
  firstName: string
  lastName: string
  // The presigned photo URL from the backend, or null for "no photo".
  // Required, not optional, on purpose: every caller has to pass what it
  // knows, so a screen can't silently forget the photo and show initials
  // forever.
  avatarUrl: string | null
  // Size and text size come from the caller: the account-menu button needs
  // a small avatar, the home page greeting a larger one.
  className?: string
}

// The user's photo in a circle, or their initials when there's no photo —
// OR when the photo fails to load. Shared by the account menu, the home
// page and the profile pages, so they always agree.
//
// Why a load failure matters here: avatarUrl is a presigned URL that
// expires after 24 hours, and the logged-in user's own copy (from
// /auth/me) is never refetched while the tab stays open. A tab left open
// overnight can hold an expired URL. Without a fallback, the header would
// show the browser's broken-image icon; with it, the initials come back
// until the next page load brings a fresh URL. (Design decisions: the
// accepted trade-off of a 24h URL over a redirect route.)
export function UserAvatar({ userId, firstName, lastName, avatarUrl, className }: UserAvatarProps) {
  // Remembers WHICH url failed, not just "something failed". That detail
  // is what makes a new URL get a fresh try automatically: after an
  // upload, avatarUrl changes, no longer equals failedUrl, and the photo
  // is shown again — no useEffect needed to reset a boolean when the prop
  // changes. Deriving from props at render time like this is simpler and
  // can't get out of sync, unlike an effect that runs one render late.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  // A truthiness check rather than `!== null`: it also treats an
  // undefined or empty value as "no photo", never as <img src="">.
  const showPhoto = Boolean(avatarUrl) && avatarUrl !== failedUrl

  return (
    <div
      className={cn(
        // overflow-hidden clips the square photo to the circle drawn by
        // rounded-full.
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium',
        // The tint stays under a photo too: unseen once the photo has
        // loaded, it's what shows while it loads (or through a transparent
        // PNG) — the same colour as the initials it replaces.
        avatarTintClass(userId),
        className,
      )}
      // Decorative everywhere it's used: the user's name is always shown
      // or announced right beside it, so reading the initials (or
      // describing the photo) as well would just be noise for a screen
      // reader.
      aria-hidden="true"
    >
      {showPhoto ? (
        <img
          // Non-null by construction: showPhoto is only true when
          // avatarUrl is a non-empty string.
          src={avatarUrl ?? undefined}
          // alt="" is the standard way to mark an image decorative (an
          // absent alt makes some screen readers read the file URL).
          alt=""
          // size-full + object-cover: fill the circle and crop any excess,
          // so a non-square photo isn't squashed.
          className="size-full object-cover"
          // Fires when the browser can't load the image (an expired
          // signature answers 403). Swap back to initials for this URL.
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        initials
      )}
    </div>
  )
}