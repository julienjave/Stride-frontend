import { Outlet } from 'react-router'
import { RoleSwitcher } from '@/auth/RoleSwitcher'
import { useLogout } from '@/auth/useLogout'
import { Button } from '@/components/ui/button'

// A LAYOUT route (element with no path, see routes.tsx's own comment on
// this pattern) wrapping every authenticated page. Its job is to render
// chrome that should be visible no matter which specific page matched —
// today that's just the role switcher and a logout button, previously
// only available on the old shared DashboardPage and nowhere else.
//
// <Outlet /> is React Router's placeholder for "whichever child route
// actually matched" — the same mechanism RequireAuth and RequireRole
// already use one level up. This layout sits BETWEEN RequireAuth and the
// actual page routes: by the time this renders, RequireAuth has already
// guaranteed a real session exists, so it's safe to assume useCurrentUser
// (used inside RoleSwitcher) has real data, not a logged-out null.
export function AuthenticatedLayout() {
  const logoutMutation = useLogout()

  return (
    <div>
      <header className="flex items-center justify-between border-b p-3">
        <RoleSwitcher />
        <Button
          size="sm"
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? 'Logging out…' : 'Log out'}
        </Button>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}