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

interface ShowHiddenToggleProps {
  // How many things are hidden.
  count: number
  // What they are, singular and plural: "removed exercise", "removed
  // exercises".
  singular: string
  plural: string
  checked: boolean
  onChange: (checked: boolean) => void
}

// "Show 2 removed exercises" — the switch for things kept for the record
// but hidden by default, so the everyday view stays clean (decided with the
// person 2026-10-13, decisions §5). One component wherever the app does
// this, so it always behaves the same:
//   - the label says HOW MANY are hidden: hidden things are never silently
//     invisible, and nobody ticks a box to find nothing;
//   - nothing at all when nothing is hidden;
//   - off on every visit — the caller holds `checked` in plain state, as
//     "Show past members" and "Show deactivated users" do.
// A plain native checkbox inside its label, the same choice as those two:
// clicking the words ticks it, and the box needs no id to be named.
export function ShowHiddenToggle({ count, singular, plural, checked, onChange }: ShowHiddenToggleProps) {
  if (count === 0) return null
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      Show {count} {count === 1 ? singular : plural}
    </label>
  )
}