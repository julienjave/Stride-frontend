import { arrayMove } from '@dnd-kit/sortable'

// The new order of a sortable list after a drag: `activeId` (the item
// dragged) moved to where `overId` (the item it was dropped on) was. Returns
// the ids in their new order, or null when nothing moved — dropped on
// itself, or an id that isn't in the list (then there's no request to send).
//
// A pure function, so it's tested with plain arrays: simulating a real drag
// in jsdom isn't possible (dnd-kit measures elements with
// getBoundingClientRect(), which jsdom always reports as zero).
//
// Generic over anything with a numeric `id` — template exercises, a
// program's exercises, and workouts all sort the same way. (Replaces
// programs/templateExerciseReorder.ts, which did this for template
// exercises only.)
export function computeReorderedIds(
  rows: ReadonlyArray<{ id: number }>,
  activeId: number,
  overId: number,
): number[] | null {
  if (activeId === overId) return null

  const oldIndex = rows.findIndex((row) => row.id === activeId)
  const newIndex = rows.findIndex((row) => row.id === overId)
  if (oldIndex === -1 || newIndex === -1) return null

  // arrayMove returns a NEW array (it copies before moving), so the cached
  // list is never changed. The spread only turns our read-only array type
  // into the mutable one arrayMove's signature asks for.
  return arrayMove([...rows], oldIndex, newIndex).map((row) => row.id)
}