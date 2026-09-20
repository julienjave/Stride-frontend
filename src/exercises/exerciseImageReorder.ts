import { arrayMove } from '@dnd-kit/sortable'
import type { ExerciseImage } from './types'

// Pulled out of ExercisePhotosPage specifically so this can be unit
// tested WITHOUT simulating a real drag through dnd-kit's sensors.
// jsdom (this project's test environment) always reports zeroed-out
// getBoundingClientRect() values — dnd-kit's collision detection
// (closestCenter, used on the gallery) fundamentally depends on real
// layout measurements to know which tile is "closest" to the pointer,
// so a simulated drag in jsdom can't meaningfully exercise that logic
// either way. What CAN be tested reliably, and is actually this
// codebase's own responsibility rather than dnd-kit's, is: given a drag
// ended over a particular tile, is the resulting order correct? That's
// exactly what this function answers, with no DOM or dnd-kit sensor
// involved at all.
export function computeReorderedKeys(
  images: ExerciseImage[],
  activeId: string,
  overId: string,
): string[] | null {
  // Dropped back on itself — nothing actually changed, so there's
  // nothing worth sending a request for.
  if (activeId === overId) return null

  const oldIndex = images.findIndex((image) => image.objectKey === activeId)
  const newIndex = images.findIndex((image) => image.objectKey === overId)
  // Defensive: a drag event referencing an id that isn't in the current
  // gallery shouldn't be possible in practice (dnd-kit only offers ids
  // actually rendered in the SortableContext), but returning null here
  // rather than proceeding with a -1 index avoids arrayMove silently
  // doing something nonsensical if that assumption is ever violated.
  if (oldIndex === -1 || newIndex === -1) return null

  return arrayMove(images, oldIndex, newIndex).map(
    (image) => image.objectKey,
  )
}