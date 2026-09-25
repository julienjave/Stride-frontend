import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { addTag, sameTags, splitTypedText, type TagRules } from './tagList'

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