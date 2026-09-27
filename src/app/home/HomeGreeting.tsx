import { UserAvatar } from '@/common/UserAvatar'

interface HomeGreetingProps {
  firstName: string
  lastName: string
  avatarUrl: string | null
}

// The top of every role's home page: the user's avatar (photo, or initials
// when there's none or it fails to load — see UserAvatar) and "Hello
// <first name>,". Shared because every home has the same structure
// (design decisions §2 and §3): the practitioner and admin homes use it
// today, the patient home will.
//
// It takes the three fields it shows as props rather than reading
// useCurrentUser() itself. The page already has the user (it needs it for
// other things), and a component that only displays what it's given is
// simpler to reason about and to test than one that fetches.
export function HomeGreeting({ firstName, lastName, avatarUrl }: HomeGreetingProps) {
  return (
    <div className="flex items-center gap-3">
      <UserAvatar
        firstName={firstName}
        lastName={lastName}
        avatarUrl={avatarUrl}
        className="size-12 text-sm"
      />
      <h1 className="text-xl font-semibold">Hello {firstName},</h1>
    </div>
  )
}