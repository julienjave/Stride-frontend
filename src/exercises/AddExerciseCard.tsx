import { Link } from 'react-router'
import { Plus } from 'lucide-react'

// Always the FIRST card in the grid (see ExerciseLibraryPage), regardless
// of search/filter/page — creating a new exercise should always be one
// click away, not something that could scroll out of view or disappear
// depending on what's currently filtered.
export function AddExerciseCard() {
  return (
    <Link
      to="/practitioner/library/new"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-muted-foreground hover:bg-muted/50"
    >
      <div className="flex h-24 items-center justify-center">
        <Plus className="h-8 w-8" aria-hidden="true" />
      </div>
      <span className="text-sm font-medium">Add New Exercise</span>
    </Link>
  )
}