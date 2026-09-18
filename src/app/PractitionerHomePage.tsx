// The bare /practitioner landing page. Deliberately minimal for now —
// mirrors AdminHomePage's own early history (see that file's comment):
// it started as a single static line before Clinics/Users existed to
// link to. This page will grow the same way, once Phase 3's roster,
// exercise library, and program templates actually have routes to link
// to. Building links to routes that don't exist yet would just be dead
// links, so this waits.
export function PractitionerHomePage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Practitioner</h1>
    </div>
  )
}