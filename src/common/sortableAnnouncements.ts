/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import type { Announcements, UniqueIdentifier } from '@dnd-kit/core'

// What a screen reader hears while someone drags with the keyboard (space
// to pick up, arrows to move, space to drop, Escape to cancel).
//
// dnd-kit announces every step through a hidden "live region" — an element
// whose text changes are read aloud. Its default sentences use the items'
// INTERNAL ids: "Draggable item 57 was moved over droppable area 58" —
// meaningless to the person listening. This builds sentences from what the
// screen shows instead, with the position the item would land in:
// "Picked up B · Strength, position 2 of 3." → "B · Strength moved to
// position 1 of 3."
//
// `items` is the list in its CURRENT order, each with the name a sighted
// person sees. Passed to <DndContext accessibility={{ announcements }}>.
//
// In a sortable list, the item you're "over" is the slot you'd land in, so
// its position IS the dragged item's would-be position.
export function sortableAnnouncements(
  items: ReadonlyArray<{ id: number; name: string }>,
): Announcements {
  const total = items.length
  // dnd-kit's ids are `UniqueIdentifier` (string | number); ours are
  // numbers, so compare as numbers.
  const indexOf = (id: UniqueIdentifier) =>
    items.findIndex((item) => item.id === Number(id))
  const nameOf = (id: UniqueIdentifier) => items[indexOf(id)]?.name ?? 'Item'
  const positionOf = (id: UniqueIdentifier) =>
    `position ${indexOf(id) + 1} of ${total}`

  return {
    onDragStart({ active }) {
      return `Picked up ${nameOf(active.id)}, ${positionOf(active.id)}.`
    },
    onDragOver({ active, over }) {
      if (!over) return `${nameOf(active.id)} is not over the list.`
      // Over its OWN slot: right after it's picked up (dnd-kit reports that
      // at once), or moved back. Nothing moved, so "moved" would mislead.
      if (over.id === active.id) return `${nameOf(active.id)} is at ${positionOf(active.id)}.`
      return `${nameOf(active.id)} moved to ${positionOf(over.id)}.`
    },
    onDragEnd({ active, over }) {
      if (!over) return `${nameOf(active.id)} was dropped. Its place didn't change.`
      return `${nameOf(active.id)} was dropped at ${positionOf(over.id)}.`
    },
    onDragCancel({ active }) {
      return `Moving ${nameOf(active.id)} was cancelled. It stays at ${positionOf(active.id)}.`
    },
  }
}