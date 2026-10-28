import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { LoadError } from '@/common/LoadError'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useClinics } from './useClinics'
import { ListSkeleton } from '@/common/Loading'

// URL scheme for this feature: /admin/clinics (this page), /admin/clinics
// /new (create), /admin/clinics/:id (the per-field edit view). Bare
// /admin is the admin home page (AdminHomePage), which links here and to
// user management.
export function ClinicsListPage() {
  // Off by default — findAll()'s own default matches (includeInactive
  // defaults to false server-side too), so an admin's normal browsing
  // view is unchanged from before this feature existed.
  const [includeInactive, setIncludeInactive] = useState(false)
  const clinicsQuery = useClinics(includeInactive)
  const { data: clinics, isLoading, isError } = clinicsQuery
  // After a "Try again" that worked, focus goes to the page's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('the clinics', clinicsQuery.isSuccess)

  return (
    <div className="mx-auto mt-12 max-w-2xl space-y-4 px-4">
      <div className="flex items-center justify-between">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          Clinics
        </h1>
        <Button asChild>
          <Link to="/admin/clinics/new">Add clinic</Link>
        </Button>
      </div>

      {/* A plain native checkbox, not a shadcn/Radix component — same
          reasoning as UsersListPage's identical toggle: no popover or
          keyboard-nav list to manage here, so Radix's extra machinery
          buys nothing. */}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={includeInactive}
          onChange={(e) => setIncludeInactive(e.target.checked)}
        />
        Show deactivated clinics
      </label>

      {isLoading && <ListSkeleton label="Loading the clinics…" />}

      {isError && <LoadError what="the clinics" queries={[clinicsQuery]} />}

      {clinics && clinics.length === 0 && (
        <p className="text-sm text-muted-foreground">No clinics yet.</p>
      )}

      {clinics && clinics.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border">
          {clinics.map((clinic) => (
            <li key={clinic.id}>
              <Link
                to={`/admin/clinics/${clinic.id}`}
                className="flex flex-col px-4 py-3 hover:bg-muted/50"
              >
                <span className="font-medium">
                  {clinic.name}
                  {!clinic.isActive && (
                    <span className="ml-2 text-xs text-muted-foreground">(deactivated)</span>
                  )}
                </span>
                <span className="text-sm text-muted-foreground">{clinic.email}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}