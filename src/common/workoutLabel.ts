// A workout's label, derived from its POSITION — never stored (decisions
// §5: "letters by order (A, B, C) + an optional name"). Templates (3a-w) and
// programs (3a-1, 3a-2) both label their workouts this way, hence common/.

// The backend allows at most 10 workouts (A–J), so one letter is always
// enough: 0 → 'A', 1 → 'B'… String.fromCharCode turns a character code into
// its character, and 'A' is code 65.
export function workoutLetter(position: number): string {
  return String.fromCharCode(65 + position)
}

// 'A', or 'A · Mobility' when the workout has a name. The name is optional
// and the backend stores "no name" as null (never ''), but a blank string is
// treated the same way here, so a label can never end in a lonely " · ".
export function workoutLabel(position: number, name: string | null): string {
  const letter = workoutLetter(position)
  return name?.trim() ? `${letter} · ${name.trim()}` : letter
}