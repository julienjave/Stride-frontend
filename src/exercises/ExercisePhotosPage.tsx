// Placeholder for the exercise photo-management screen — upload,
// reorder, and remove individual images. A separate, follow-up pass per
// the design discussion. The backend for all three operations already
// exists and is fully tested (POST/PATCH/DELETE /exercises/:id/images);
// only this frontend widget remains. Reached two ways: right after
// creating a new exercise (NewExercisePage redirects here), and, once
// built, from the exercise detail page's own "Manage Photos" link — this
// was deliberately NOT built as creation-flow-only code.
export function ExercisePhotosPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Manage Photos (placeholder)</h1>
    </div>
  )
}