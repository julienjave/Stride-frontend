import { describe, it, expect, vi } from 'vitest'
import { ignoreEmptySelection } from './ignoreEmptySelection'

describe('ignoreEmptySelection', () => {
  it('passes a chosen value through', () => {
    const onChange = vi.fn()
    ignoreEmptySelection(onChange)('2')
    expect(onChange).toHaveBeenCalledWith('2')
  })

  // The two shapes Radix's echo of a reset takes.
  it('ignores an empty string and undefined', () => {
    const onChange = vi.fn()
    const handler = ignoreEmptySelection(onChange)
    handler('')
    handler(undefined)
    expect(onChange).not.toHaveBeenCalled()
  })
})