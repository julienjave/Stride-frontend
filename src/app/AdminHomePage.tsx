import { Link } from 'react-router'

// The bare /admin landing page. Used to be AdminPlaceholderPage — a
// single static line — deliberately left that way until a SECOND admin
// area existed to link alongside Clinics (see the comment that used to
// sit at the top of ClinicsListPage.tsx). User management now exists.
//
// "Users" now points to the list page (UsersListPage), not straight to
// the create form — the same relationship /admin/clinics already has
// with /admin/clinics/new. This resolves this file's own earlier
// comment, which anticipated exactly this once the list page existed.
export function AdminHomePage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <nav className="space-y-2">
        <Link to="/admin/clinics" className="block rounded-lg border p-3 hover:bg-muted">
          Clinics
        </Link>
        <Link to="/admin/users" className="block rounded-lg border p-3 hover:bg-muted">
          Users
        </Link>
      </nav>
    </div>
  )
}