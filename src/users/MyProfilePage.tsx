// Placeholder for the shared /profile page (design decisions §4): one
// route for every role, reached from the account menu, with a
// role-specific section below the common fields. The backend already
// supports self-editing (GET/PATCH /users/:id via the `isSelf` check), but
// the editable-fields UI doesn't exist yet anywhere in the app, not even
// on the admin's own UserEditPage (deliberately left read-only when that
// page was built). Building it is the next roadmap item, and the natural
// moment to add one shared editable-fields component that UserEditPage
// can reuse too.
export function MyProfilePage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">My Profile (placeholder)</h1>
    </div>
  )
}