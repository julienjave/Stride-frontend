// Placeholder for practitioner profile editing. The backend already
// supports this (GET/PATCH /users/:id via the `isSelf` check — see the
// roadmap's Phase 3 notes), but the editable-fields UI itself doesn't
// exist yet anywhere in the app, not even on the admin's own
// UserEditPage (deliberately left read-only when that page was built).
// Building this out is a Phase 3 item in its own right, and per the
// roadmap's own note, a natural moment to add one shared, reusable
// editable-fields component rather than a one-off just for this page.
export function MyProfilePage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">My Profile (placeholder)</h1>
    </div>
  )
}