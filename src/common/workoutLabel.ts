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