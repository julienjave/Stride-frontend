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