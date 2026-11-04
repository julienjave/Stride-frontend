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

import { z, type ZodType } from 'zod'

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

// --- A TAG LIST BEING EDITED ---------------------------------------------

// Everything a tag input holds while someone is using it: the confirmed
// tags (the chips), AND the text typed in the box but not confirmed yet.
// They travel together because the text is part of what the person means:
// "Sports" typed but never followed by Enter is still a specialty they
// want — so saving must include it, and anything that saves needs both.
export interface TagDraft {
  tags: string[]
  text: string
}

export const EMPTY_TAG_DRAFT: TagDraft = { tags: [], text: '' }

// The result of one editing step: the new draft, plus the message to show
// if an entry was refused (null when everything was accepted).
export interface TagDraftUpdate {
  draft: TagDraft
  error: string | null
}

// Adds entries one by one, stopping at the first one that's refused. The
// entries accepted before it are kept; the refused one goes back into the
// box, so the person can see what was wrong and fix it. `rest` is what
// the box holds when EVERYTHING was accepted.
function addEntries(
  tags: string[],
  entries: string[],
  rest: string,
  rules: TagRules,
): TagDraftUpdate {
  let next = tags
  for (const entry of entries) {
    const result = addTag(next, entry, rules)
    if (!result.ok) {
      return { draft: { tags: next, text: entry.trim() }, error: result.error }
    }
    next = result.tags
  }
  return { draft: { tags: next, text: rest }, error: null }
}

// The box's text changed (a keystroke or a paste). A comma finishes an
// entry: everything before the last comma is added, the rest stays in the
// box. With no comma, only the text changes.
export function typeTagText(draft: TagDraft, newText: string, rules: TagRules): TagDraftUpdate {
  const { complete, rest } = splitTypedText(newText)
  if (complete.length === 0) {
    return { draft: { ...draft, text: newText }, error: null }
  }
  return addEntries(draft.tags, complete, rest, rules)
}

// Enter pressed — or the form is being saved: the typed text becomes a
// tag (if there is any), and the box empties.
export function commitTagText(draft: TagDraft, rules: TagRules): TagDraftUpdate {
  return addEntries(draft.tags, [draft.text], '', rules)
}

// A chip's × clicked (or Backspace in an empty box).
export function removeTagAt(draft: TagDraft, index: number): TagDraft {
  // filter() builds a new array without that one entry.
  return { ...draft, tags: draft.tags.filter((_, position) => position !== index) }
}

// The Zod schema for a tag list inside a react-hook-form form. The form
// holds a whole TagDraft (the chips AND the unconfirmed text); this turns
// it into the plain string[] the API wants.
//
// `.transform()` runs after the shape is checked, and its return value is
// what the form's submit handler receives. It uses the SAME commitTagText
// as pressing Enter, so text left in the box is added on submit exactly as
// if Enter had been pressed — or, if that text would be refused (a
// duplicate, too long…), the submit is blocked with the same message.
// `ctx.addIssue()` inside a transform reports that as a normal validation
// error on this field; returning z.NEVER says "there is no valid output".
export function tagDraftSchema(rules: TagRules) {
  return z.object({ tags: z.array(z.string()), text: z.string() }).transform((draft, ctx) => {
    const { draft: committed, error } = commitTagText(draft, rules)
    if (error) {
      ctx.addIssue({ code: 'custom', message: error })
      return z.NEVER
    }
    return committed.tags
  })
}