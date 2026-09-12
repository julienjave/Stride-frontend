import { useCurrentUser } from './useCurrentUser'
import { useSwitchRole } from './useSwitchRole'
import { Button } from '@/components/ui/button'
import type { UserRole } from './schemas'

export function RoleSwitcher() {
  const { data: user } = useCurrentUser()
  const switchRoleMutation = useSwitchRole()

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
            onClick={() => switchRoleMutation.mutate(role as UserRole)}
            disabled={switchRoleMutation.isPending}
          >
            Switch to {role}
          </Button>
        ))}
    </div>
  )
}