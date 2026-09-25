import type { ZodType } from 'zod'

// The rules of a tag list (specialties today), kept apart from the React
// component that displays it. These are pure functions: same input, same
// output, no state — so every rule is tested directly, without rendering
// anything, and the component stays about DISPLAY only.

export interface TagRules {
  // Validates (and normalizes, e.g. trims) ONE tag.
  itemSchema: ZodType<string>
  maxItems: number
}

export type AddTagResult =
  | { ok: true; tags: string[] }
  | { ok: false; error: string }

// Tries to add one typed entry to the list.
//
// A "result" object, not an exception, for an expected outcome: a
// duplicate or a too-long entry is ordinary user input, not a bug, and the
// caller must handle both branches. TypeScript enforces that — `tags` only
// exists once `ok` has been checked.
export function addTag(tags: string[], raw: string, rules: TagRules): AddTagResult {
  // An empty entry (Enter on an empty box, or ",," while typing) is not an
  // error — just nothing to add.
  if (raw.trim() === '') {
    return { ok: true, tags }
  }

  const parsed = rules.itemSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid entry' }
  }
  const tag = parsed.data

  // "Sports Rehab" and "sports rehab" are the same specialty. Comparing
  // lowercased copies catches that, while the list keeps the spelling the
  // person typed first.
  if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
    return { ok: false, error: `"${tag}" is already in the list` }
  }

  if (tags.length >= rules.maxItems) {
    return { ok: false, error: `You can add up to ${rules.maxItems}` }
  }

  // A NEW array, never tags.push(): React only notices state changes
  // when it receives a different object, and the caller's current array
  // may still be in use by the screen that is showing it.
  return { ok: true, tags: [...tags, tag] }
}

// What the box does when its text contains commas — typed one at a time,
// or pasted all at once ("Sports, Pediatrics, "). Everything BEFORE the
// last comma is a finished entry to add; the part after it is what the
// person is still typing, so it stays in the box.
export function splitTypedText(text: string): { complete: string[]; rest: string } {
  const parts = text.split(',')
  const rest = parts.pop() ?? ''
  return { complete: parts, rest }
}

// Whether two lists hold the same tags in the same order — used to skip a
// save when nothing actually changed.
export function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}