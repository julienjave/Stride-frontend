import { Link } from 'react-router'

// The bare /admin landing page. Used to be AdminPlaceholderPage — a
// single static line — deliberately left that way until a SECOND admin
// area existed to link alongside Clinics (see the comment that used to
// sit at the top of ClinicsListPage.tsx). User management now exists
// (CreateUserPage), so this is that promised follow-up.
//
// "Add a user" links straight to the create form, not to a /admin/users
// list — because that list doesn't exist yet (it's the next roadmap
// item, needed for granting roles/deactivating). Once it does, this link
// should point there instead, with "add a user" becoming a button on
// that list page — the same relationship /admin/clinics already has with
// /admin/clinics/new.
export function AdminHomePage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <nav className="space-y-2">
        <Link to="/admin/clinics" className="block rounded-lg border p-3 hover:bg-muted">
          Clinics
        </Link>
        <Link to="/admin/users/new" className="block rounded-lg border p-3 hover:bg-muted">
          Add a user
        </Link>
      </nav>
    </div>
  )
}