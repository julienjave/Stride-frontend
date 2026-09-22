import { Link } from 'react-router'
import { Plus } from 'lucide-react'

interface AddTemplateExerciseCardProps {
  templateId: number
}

// Positioned LAST when the template already has exercises, but FIRST
// when it has none — deliberately different from the exercise Library's
// own AddExerciseCard (always first regardless), per the design
// discussion. Positioning is handled by the caller (TemplateExercisesPage),
// not this component, since it depends on how many OTHER cards exist.
export function AddTemplateExerciseCard({
  templateId,
}: AddTemplateExerciseCardProps) {
  return (
    <Link
      to={`/practitioner/programs/templates/${templateId}/exercises/new`}
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-muted-foreground hover:bg-muted/50"
    >
      <div className="flex h-16 items-center justify-center">
        <Plus className="h-6 w-6" aria-hidden="true" />
      </div>
      <span className="text-sm font-medium">Add New Exercise</span>
    </Link>
  )
}