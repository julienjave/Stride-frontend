import { cn } from '@/lib/utils'

interface UserAvatarProps {
  firstName: string
  lastName: string
  // Size and text size come from the caller: the account-menu button needs
  // a small avatar, the home page greeting a larger one.
  className?: string
}

// Initials-only avatar, extracted from PractitionerHomePage now that the
// account menu needs the same thing — one definition, so both places
// always show identical initials.
//
// Still initials, not a photo: avatarPath is a raw internal storage key,
// not a usable URL (see users/types.ts). Real photos are Phase 6 work;
// when they land, this is the single component that changes.
export function UserAvatar({ firstName, lastName, className }: UserAvatarProps) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-muted font-medium',
        className,
      )}
      // Decorative everywhere it's used: the user's name is always shown
      // or announced right beside it, so reading the initials out as well
      // would just be noise for a screen reader.
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}