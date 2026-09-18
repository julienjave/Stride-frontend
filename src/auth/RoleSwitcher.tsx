import { useNavigate } from 'react-router'
import { useCurrentUser } from './useCurrentUser'
import { useSwitchRole } from './useSwitchRole'
import { Button } from '@/components/ui/button'
import { roleHomePath } from '@/app/roleHomePath'
import type { UserRole } from './schemas'

export function RoleSwitcher() {
  const { data: user } = useCurrentUser()
  const switchRoleMutation = useSwitchRole()
  const navigate = useNavigate()

  // Nothing to switch between on a single-role account — rendering
  // nothing here (rather than a disabled/empty control): there's no
  // reason to show switching UI for an action that could never apply.
  if (!user || user.roles.length <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        Viewing as: {user.activeRole}
      </span>
      {user.roles
        .filter((role) => role !== user.activeRole)
        .map((role) => (
          <Button
            key={role}
            size="sm"
            variant="outline"
            onClick={() =>
              switchRoleMutation.mutate(role as UserRole, {
                // TanStack Query calls the mutation's OWN onSuccess (in
                // useSwitchRole.ts — cache invalidation) first, then this
                // per-call onSuccess. Navigation happens here, not inside
                // useSwitchRole itself, specifically to avoid importing
                // the router singleton back into a hook that DashboardPage
                // (now AuthenticatedLayout) → RoleSwitcher → useSwitchRole
                // already forms a chain into — routes.tsx already imports
                // AuthenticatedLayout, which renders RoleSwitcher, which
                // uses useSwitchRole; if useSwitchRole then imported
                // `router` back from routes.tsx, that would be a circular
                // import. useNavigate() (React Router's own in-component
                // hook) sidesteps that entirely.
                onSuccess: (updatedUser) => {
                  // navigate() returns a Promise; `void` here is the same
                  // established pattern routes.tsx already uses for
                  // router.navigate() in its 401 handler — explicitly
                  // saying "I'm not awaiting this on purpose," which is
                  // what @typescript-eslint/no-floating-promises requires
                  // rather than silently ignoring an un-awaited promise.
                  void navigate(roleHomePath(updatedUser.activeRole as UserRole))
                },
              })
            }
            disabled={switchRoleMutation.isPending}
          >
            Switch to {role}
          </Button>
        ))}
    </div>
  )
}