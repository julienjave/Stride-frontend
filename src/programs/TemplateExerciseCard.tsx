import { Link, useLocation } from 'react-router'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TemplateExercise } from './types'

// Two cards, one shared body:
//
// - TemplateExerciseCard: the editable version — draggable (dnd-kit's
//   useSortable), with a drag handle and a delete button.
// - ReadOnlyTemplateExerciseCard: the same content with neither, for a
//   template the current user can't edit (someone else's, or archived).
//
// Why two components instead of one card with a `canEdit` flag? Because
// useSortable is a hook that REGISTERS the card with the surrounding
// <DndContext>/<SortableContext> — it's only meaningful inside one. A
// read-only list has no DndContext at all, so the read-only card must
// not call useSortable, and React's rules of hooks forbid calling a hook
// conditionally ("if (canEdit) useSortable(...)"). Splitting on the
// component boundary is the standard way around that: each component
// calls the hooks it needs, unconditionally, and the PARENT decides
// which component to render.

interface CardLinkProps {
  templateId: number
  item: TemplateExercise
  // Extra classes for the link's padding — the editable card needs room
  // on both sides for the absolutely-positioned drag handle and delete
  // button; the read-only card doesn't.
  className?: string
}

// The clickable body both cards share: exercise name, muscles, and the
// prescription summary, linking to that row's own view/edit page.
function CardLink({ templateId, item, className }: CardLinkProps) {
  // The current page's own URL — whichever list is rendering this card
  // (TemplateDetailPage today) is where the exercise page's "Done"/"Back"
  // and "Remove from Template" should navigate back to. Computed here via
  // useLocation rather than passed as a prop, since the card can always
  // correctly reference its OWN current URL without the parent needing
  // to know or pass anything extra.
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`

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
    <Link
      to={`/practitioner/programs/templates/${templateId}/exercises/${item.id}?returnTo=${encodeURIComponent(returnTo)}`}
      className={cn('block p-3 hover:bg-muted', className)}
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
  )
}

interface TemplateExerciseCardProps {
  templateId: number
  item: TemplateExercise
  onDelete: () => void
  deleting: boolean
}

// Same overall shape as SortableExerciseImage — a separate drag handle
// rather than the whole card, so dnd-kit's pointer listeners don't
// intercept clicks meant for the delete button or the link underneath.
// The delete button sits as a SIBLING of the Link, not nested inside it,
// since a <button> inside an <a> is invalid HTML (same reasoning as every
// other Button-next-to-Link layout in this app).
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

  return (
    <div ref={setNodeRef} style={style} className="relative rounded-lg border">
      <CardLink templateId={templateId} item={item} className="pl-8 pr-10" />

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

// No drag handle, no delete button, no dnd-kit — just the shared body in
// the same bordered frame, so both lists look like the same kind of list.
export function ReadOnlyTemplateExerciseCard({
  templateId,
  item,
}: {
  templateId: number
  item: TemplateExercise
}) {
  return (
    <div className="rounded-lg border">
      <CardLink templateId={templateId} item={item} />
    </div>
  )
}