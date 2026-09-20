// Placeholder for a single template's detail/edit page — deliberately
// separate from AssignedProgramDetailPage (see the programs hub
// discussion): templates and assigned programs are different enough
// entities under the hood (a template has no patient, no dates, no
// status) that they're expected to diverge in content once designed,
// not just styling.
export function TemplateDetailPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Template (placeholder)</h1>
    </div>
  )
}