import { arrayMove } from '@dnd-kit/sortable'
import type { TemplateExercise } from './types'

// Same reasoning as exercises/exerciseImageReorder.ts's
// computeReorderedKeys — pulled out so this can be unit tested without
// simulating a real drag through dnd-kit's sensors, which jsdom can't
// meaningfully support anyway (getBoundingClientRect() always reports
// zeroed-out values, and dnd-kit's collision detection depends on real
// layout measurements). Operates on numeric row ids
// (template_exercises.id) rather than the string objectKeys the photo
// version used — same shape of function, different id type, not
// reused directly since the two aren't otherwise related.
export function computeReorderedTemplateExerciseIds(
  rows: TemplateExercise[],
  activeId: number,
  overId: number,
): number[] | null {
  if (activeId === overId) return null

  const oldIndex = rows.findIndex((row) => row.id === activeId)
  const newIndex = rows.findIndex((row) => row.id === overId)
  if (oldIndex === -1 || newIndex === -1) return null

  return arrayMove(rows, oldIndex, newIndex).map((row) => row.id)
}