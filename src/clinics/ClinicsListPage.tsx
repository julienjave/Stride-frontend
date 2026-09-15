import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useClinics } from './useClinics'

// URL scheme assumed for this feature (not yet wired into routes.tsx —
// that's a later piece): /admin/clinics (this page), /admin/clinics/new
// (create), /admin/clinics/:id (the per-field edit view). Bare /admin
// itself is left alone for now, still AdminPlaceholderPage, rather than
// redirecting it here or turning it into a hub page — that's a call
// better made once a second admin area (user management) actually exists
// to link to, not invented ahead of need for a single feature.
export function ClinicsListPage() {
  const { data: clinics, isLoading, isError } = useClinics()

  return (
    <div className="mx-auto mt-12 max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clinics</h1>
        <Button asChild>
          <Link to="/admin/clinics/new">Add clinic</Link>
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading clinics…</p>}

      {isError && (
        <p className="text-sm text-destructive">Couldn't load clinics. Try refreshing.</p>
      )}

      {/* findAll() only ever returns active clinics (WHERE is_active = true,
          confirmed in ClinicsService) — a deactivated clinic simply
          disappears from this list rather than showing with a "deactivated"
          badge. That's a backend behavior this page reflects as-is, not
          something worked around here. */}
      {clinics && clinics.length === 0 && (
        <p className="text-sm text-muted-foreground">No active clinics yet.</p>
      )}

      {clinics && clinics.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border">
          {clinics.map((clinic) => (
            <li key={clinic.id}>
              <Link
                to={`/admin/clinics/${clinic.id}`}
                className="flex flex-col px-4 py-3 hover:bg-muted/50"
              >
                <span className="font-medium">{clinic.name}</span>
                <span className="text-sm text-muted-foreground">{clinic.email}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}