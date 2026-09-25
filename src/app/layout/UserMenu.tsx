import { Link, useNavigate } from 'react-router'
import { LogOut, UserRound } from 'lucide-react'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { useLogout } from '@/auth/useLogout'
import { useSwitchRole } from '@/auth/useSwitchRole'
import { RoleSwitcher } from '@/auth/RoleSwitcher'
import { roleLabel } from '@/auth/roleLabel'
import type { UserRole } from '@/auth/schemas'
import { UserAvatar } from '@/common/UserAvatar'
import { roleHomePath } from '@/app/roleHomePath'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// The account ("avatar") menu, design decisions §1: Profile, the role
// switcher, and Log out — everything about "me", in one place.
export function UserMenu() {
  const { data: user } = useCurrentUser()
  const logoutMutation = useLogout()
  const switchRoleMutation = useSwitchRole()
  const navigate = useNavigate()

  // Defensive only: this renders inside AuthenticatedLayout, which only
  // renders once RequireAuth has confirmed a real user.
  if (!user) {
    return null
  }

  const fullName = `${user.firstName} ${user.lastName}`

  // The role switch lives HERE, not inside RoleSwitcher, because this
  // component stays mounted in the header while the menu opens and closes.
  // RoleSwitcher sits inside the menu's content, which is removed from the
  // page the moment an item is chosen — and TanStack Query skips a
  // per-call onSuccess (the one passed to mutate()) when the component
  // that called mutate() is gone by the time the request finishes. With
  // the mutation owned by RoleSwitcher, the redirect below never ran.
  function switchTo(role: UserRole) {
    switchRoleMutation.mutate(role, {
      // Runs AFTER useSwitchRole's own onSuccess (which puts the new user
      // in the cache), so by the time we navigate, every guard on the new
      // page already sees the new active role.
      onSuccess: (updatedUser) => {
        // `void`: deliberately not awaiting navigate()'s Promise, which is
        // what @typescript-eslint/no-floating-promises requires us to say
        // out loud.
        void navigate(roleHomePath(updatedUser.activeRole as UserRole))
      },
    })
  }
  const activeRoleLabel = roleLabel(user.activeRole as UserRole)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // An explicit accessible name, because on phones the visible name
        // is hidden and the avatar is aria-hidden — without this the
        // button would have no name at all there.
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-lg p-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar
          firstName={user.firstName}
          lastName={user.lastName}
          className="size-8 text-xs"
        />
        {/* Name with the ACTIVE ROLE as text under it (§1), rather than a
            small badge on the avatar: text is unambiguous and readable at
            a glance. Hidden below `md` — the phone top bar has no room,
            and there the menu's own header (below) carries the same
            information. */}
        <span className="hidden flex-col leading-tight md:flex">
          <span className="text-sm font-medium">{user.firstName}</span>
          <span className="text-xs text-muted-foreground">
            {activeRoleLabel}
          </span>
        </span>
      </DropdownMenuTrigger>

      {/* align="end": the menu's right edge lines up with the trigger's,
          so a menu opened from the far-right corner opens inward instead
          of off-screen. */}
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium text-foreground">
            {fullName}
          </span>
          <span className="block text-xs">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* asChild makes the menu item BE the <Link> — a real anchor with
            a real href (middle-click, "open in new tab" and screen readers
            all behave like a normal link), while Radix still gives it
            menu keyboard handling and closes the menu on selection. */}
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserRound aria-hidden="true" />
            Profile
          </Link>
        </DropdownMenuItem>

        <RoleSwitcher
          onSwitch={switchTo}
          isSwitching={switchRoleMutation.isPending}
        />

        <DropdownMenuSeparator />
        {/* onSelect (Radix's menu event), not onClick: it fires for mouse,
            Enter and Space alike. */}
        <DropdownMenuItem
          onSelect={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut aria-hidden="true" />
          {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}