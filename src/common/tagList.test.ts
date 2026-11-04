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

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  addTag,
  commitTagText,
  removeTagAt,
  sameTags,
  splitTypedText,
  tagDraftSchema,
  typeTagText,
  type TagRules,
} from './tagList'

const rules: TagRules = {
  itemSchema: z.string().trim().min(1, 'Enter something').max(10, 'Too long'),
  maxItems: 3,
}

describe('addTag', () => {
  it('adds a trimmed entry to the end, returning a NEW array', () => {
    const tags = ['Ortho']
    const result = addTag(tags, '  Sports ', rules)
    expect(result).toEqual({ ok: true, tags: ['Ortho', 'Sports'] })
    // The original is untouched — React relies on getting a new array.
    expect(tags).toEqual(['Ortho'])
  })

  it('treats an empty or blank entry as "nothing to add", not an error', () => {
    expect(addTag(['Ortho'], '   ', rules)).toEqual({ ok: true, tags: ['Ortho'] })
  })

  it("rejects a duplicate, whatever its capitalisation", () => {
    expect(addTag(['Sports'], 'sports', rules)).toEqual({
      ok: false,
      error: '"sports" is already in the list',
    })
  })

  it('rejects an entry the item schema refuses, with its message', () => {
    expect(addTag([], 'much too long', rules)).toEqual({ ok: false, error: 'Too long' })
  })

  it('refuses to go past the maximum number of entries', () => {
    expect(addTag(['A', 'B', 'C'], 'D', rules)).toEqual({
      ok: false,
      error: 'You can add up to 3',
    })
  })
})

describe('splitTypedText', () => {
  it('keeps text with no comma in the box', () => {
    expect(splitTypedText('Spor')).toEqual({ complete: [], rest: 'Spor' })
  })

  it('treats everything before the last comma as finished entries', () => {
    expect(splitTypedText('Sports, Pediatrics, Neu')).toEqual({
      complete: ['Sports', ' Pediatrics'],
      rest: ' Neu',
    })
  })
})

describe('sameTags', () => {
  it('is true only for the same tags in the same order', () => {
    expect(sameTags(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameTags(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(sameTags(['a'], ['a', 'b'])).toBe(false)
  })
})

describe('typeTagText', () => {
  it('only updates the text when there is no comma', () => {
    expect(typeTagText({ tags: ['A'], text: 'Sp' }, 'Spo', rules)).toEqual({
      draft: { tags: ['A'], text: 'Spo' },
      error: null,
    })
  })

  it('turns everything before the last comma into tags, keeping the rest in the box', () => {
    expect(typeTagText({ tags: [], text: '' }, 'Sports, Neuro,Pe', rules)).toEqual({
      draft: { tags: ['Sports', 'Neuro'], text: 'Pe' },
      error: null,
    })
  })

  // The refused entry goes back in the box, so the person can fix it;
  // what came before it is kept, what came after it is dropped.
  it('stops at the first refused entry, keeping it in the box with its message', () => {
    expect(typeTagText({ tags: ['A'], text: '' }, 'B, a, C,', rules)).toEqual({
      draft: { tags: ['A', 'B'], text: 'a' },
      error: '"a" is already in the list',
    })
  })
})

describe('commitTagText', () => {
  it('turns the typed text into a tag and empties the box', () => {
    expect(commitTagText({ tags: ['A'], text: ' B ' }, rules)).toEqual({
      draft: { tags: ['A', 'B'], text: '' },
      error: null,
    })
  })

  it('does nothing with an empty box', () => {
    expect(commitTagText({ tags: ['A'], text: '' }, rules)).toEqual({
      draft: { tags: ['A'], text: '' },
      error: null,
    })
  })

  it('keeps refused text in the box, with the message', () => {
    expect(commitTagText({ tags: [], text: 'much too long' }, rules)).toEqual({
      draft: { tags: [], text: 'much too long' },
      error: 'Too long',
    })
  })
})

describe('removeTagAt', () => {
  it('removes one tag by position, leaving the typed text alone', () => {
    const draft = { tags: ['A', 'B', 'C'], text: 'D' }
    expect(removeTagAt(draft, 1)).toEqual({ tags: ['A', 'C'], text: 'D' })
    // A new array — the original is untouched.
    expect(draft.tags).toEqual(['A', 'B', 'C'])
  })
})

// What a form's submit handler receives: a plain list, with text left in
// the box included — or a validation error, with the same message Enter
// would have shown.
describe('tagDraftSchema', () => {
  const schema = tagDraftSchema(rules)

  it('outputs the tags, plus any text left in the box', () => {
    expect(schema.parse({ tags: ['A'], text: 'B' })).toEqual(['A', 'B'])
    expect(schema.parse({ tags: [], text: '' })).toEqual([])
  })

  it("fails with the tag rule's message when the leftover text is refused", () => {
    const result = schema.safeParse({ tags: ['A'], text: 'a' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('"a" is already in the list')
  })
})