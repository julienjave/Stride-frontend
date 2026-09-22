import { Link } from 'react-router'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TemplateExercise } from './types'

interface TemplateExerciseCardProps {
  templateId: number
  item: TemplateExercise
  onDelete: () => void
  deleting: boolean
}

// Same overall shape as SortableExerciseImage — a separate drag handle
// rather than the whole card, so dnd-kit's pointer listeners don't
// intercept clicks meant for the delete button or the link underneath.
// The main content is a Link (not a button), since clicking a card
// navigates to that exercise's own view/edit page — the delete button
// sits as a SIBLING of the Link, not nested inside it, since a <button>
// inside an <a> is invalid HTML (same reasoning as every other
// Button-next-to-Link layout in this app).
export function TemplateExerciseCard({
  templateId,
  item,
  onDelete,
  deleting,
}: TemplateExerciseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const name = item.exercise?.name ?? 'Unknown exercise'
  const muscles = item.exercise?.primaryMuscles ?? []

  const detailParts: string[] = []
  if (item.sets) detailParts.push(`${item.sets} sets`)
  if (item.reps) detailParts.push(`${item.reps} reps`)
  if (item.durationInSeconds) detailParts.push(`${item.durationInSeconds}s`)
  // != null, not a truthy check — a weight of exactly 0 is a real,
  // if unusual, value (matching the backend's own hasStartedWeight
  // reasoning), not the same as "no weight set."
  if (item.weight != null && item.weightUnit) {
    detailParts.push(`${item.weight} ${item.weightUnit}`)
  }

  return (
    <div ref={setNodeRef} style={style} className="relative rounded-lg border">
      <Link
        to={`/practitioner/programs/templates/${templateId}/exercises/${item.id}`}
        className="block p-3 pl-8 pr-10 hover:bg-muted"
      >
        <p className="font-medium">{name}</p>
        {muscles.length > 0 && (
          <p className="text-sm text-muted-foreground">{muscles.join(', ')}</p>
        )}
        {detailParts.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {detailParts.join(' · ')}
          </p>
        )}
      </Link>

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${name}`}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab rounded p-1 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Remove ${name} from template`}
        disabled={deleting}
        onClick={onDelete}
        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}