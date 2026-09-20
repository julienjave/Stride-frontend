import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExerciseImage } from './types'

interface SortableExerciseImageProps {
  image: ExerciseImage
  alt: string
  onDelete: () => void
  deleting: boolean
}

// One tile in the reorderable gallery. The drag handle is a SEPARATE
// small element (the grip icon), not the whole card — dnd-kit's own
// recommended pattern for a card that also has its own clickable
// controls. Spreading the drag listeners over the entire card would
// intercept pointer events meant for the delete button below, since
// dnd-kit needs to see the pointer-down before anything else does to
// tell "starting a drag" from "clicking a button" apart.
export function SortableExerciseImage({
  image,
  alt,
  onDelete,
  deleting,
}: SortableExerciseImageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.objectKey })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Dimmed while actively being dragged — a standard, small visual cue
    // that THIS is the tile currently being moved, distinct from the
    // rest of the grid reflowing around it.
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative overflow-hidden rounded-lg border"
    >
      <img src={image.url} alt={alt} className="h-32 w-full object-cover" />

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute left-1 top-1 cursor-grab rounded bg-background/80 p-1 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Remove this photo"
        disabled={deleting}
        onClick={onDelete}
        className="absolute right-1 top-1 h-7 w-7 bg-background/80"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}