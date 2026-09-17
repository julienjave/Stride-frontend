import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useUsers } from './useUsers'

// URL scheme for this feature, mirroring clinics exactly: /admin/users
// (this page), /admin/users/new (create, already built), /admin/users/:id
// (the edit view, built alongside this page — see UserEditPage.tsx).
export function UsersListPage() {
  const { data: users, isLoading, isError } = useUsers()

  return (
    <div className="mx-auto mt-12 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <Button asChild>
          <Link to="/admin/users/new">Add user</Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading users…</p>}

      {isError && (
        <p className="text-sm text-destructive">Couldn't load users. Try refreshing.</p>
      )}

      {users && users.length === 0 && (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      )}

      {users && users.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                to={`/admin/users/${user.id}`}
                className="flex flex-col px-4 py-3 hover:bg-muted/50"
              >
                <span className="font-medium">
                  {user.firstName} {user.lastName}
                  {!user.isActive && (
                    <span className="ml-2 text-xs text-muted-foreground">(deactivated)</span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
                <span className="text-xs text-muted-foreground">
                  {user.roles.join(', ')}
                  {user.clinics.length > 0 &&
                    ` · ${user.clinics.map((clinic) => clinic.name).join(', ')}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}