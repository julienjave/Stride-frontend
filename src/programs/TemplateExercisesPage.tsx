// Placeholder for Screen 2 of the template creation flow — the
// reorderable exercise-card list, per the design discussion. Deliberately
// a stable, reusable route (not creation-flow-only): NewTemplatePage
// redirects here right after creating a template, and this same screen
// is meant to be reused later from the template detail page's own
// "manage exercises" entry point, mirroring exactly how
// ExercisePhotosPage was built for exercises.
export function TemplateExercisesPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Template Exercises (placeholder)</h1>
    </div>
  )
}