import { describe, expect, it } from 'vitest'
import {
  addSnackbar,
  closeSnackbarIn,
  MAX_SNACKBARS,
  snackbarDuration,
  SUCCESS_MAX_MS,
  SUCCESS_MIN_MS,
  type Snackbar,
} from './snackbarRules'

// A row with defaults, so each test spells out only what it is about.
function row(id: number, kind: Snackbar['kind'] = 'success', text = `Message ${id}`, open = true): Snackbar {
  return { id, kind, text, open }
}

describe('snackbarDuration', () => {
  it('gives a short success the minimum', () => {
    expect(snackbarDuration('success', 'Entry added.')).toBe(SUCCESS_MIN_MS)
  })

  it('gives a longer success 2 s plus 50 ms a character', () => {
    // 80 characters: 2,000 + 80 × 50 = 6,000 ms — above the minimum, below the cap.
    expect(snackbarDuration('success', 'x'.repeat(80))).toBe(6_000)
    // Exactly at the minimum's edge: 60 characters = 5,000 ms.
    expect(snackbarDuration('success', 'x'.repeat(60))).toBe(5_000)
    expect(snackbarDuration('success', 'x'.repeat(61))).toBe(5_050)
  })

  it('never gives a success more than the cap', () => {
    expect(snackbarDuration('success', 'x'.repeat(1_000))).toBe(SUCCESS_MAX_MS)
  })

  it('never closes a failure by itself, however short', () => {
    expect(snackbarDuration('failure', 'No.')).toBe(Infinity)
  })
})

describe('addSnackbar', () => {
  it('adds the new one at the end', () => {
    expect(addSnackbar([row(1)], row(2))).toEqual([row(1), row(2)])
  })

  it('drops rows already closed', () => {
    expect(addSnackbar([row(1, 'success', 'A', false), row(2)], row(3))).toEqual([row(2), row(3)])
  })

  it('replaces the same message of the same kind instead of stacking a copy', () => {
    const list = [row(1, 'failure', "Couldn't save."), row(2)]
    expect(addSnackbar(list, row(3, 'failure', "Couldn't save."))).toEqual([
      row(2),
      row(3, 'failure', "Couldn't save."),
    ])
  })

  it('keeps the same words of the OTHER kind', () => {
    const list = [row(1, 'success', 'Same words')]
    expect(addSnackbar(list, row(2, 'failure', 'Same words'))).toHaveLength(2)
  })

  it(`keeps at most ${MAX_SNACKBARS}, pushing out the oldest success first`, () => {
    // [failure 1, success 2, success 3] + 4 → success 2 (the oldest SUCCESS) goes,
    // not failure 1 (older, but a failure waits to be closed).
    const list = [row(1, 'failure'), row(2), row(3)]
    expect(addSnackbar(list, row(4)).map((r) => r.id)).toEqual([1, 3, 4])
  })

  it('pushes out the oldest failure only when every earlier row is a failure', () => {
    const list = [row(1, 'failure'), row(2, 'failure'), row(3, 'failure')]
    expect(addSnackbar(list, row(4, 'failure')).map((r) => r.id)).toEqual([2, 3, 4])
  })

  it('never pushes out the new row, even a success among failures', () => {
    const list = [row(1, 'failure'), row(2, 'failure'), row(3, 'failure')]
    expect(addSnackbar(list, row(4)).map((r) => r.id)).toEqual([2, 3, 4])
  })

  it('counts only open rows against the limit', () => {
    const list = [row(1, 'success', 'A', false), row(2), row(3)]
    expect(addSnackbar(list, row(4)).map((r) => r.id)).toEqual([2, 3, 4])
  })

  it('does not change the list it was given', () => {
    const list = [row(1), row(2), row(3)]
    addSnackbar(list, row(4))
    expect(list.map((r) => r.id)).toEqual([1, 2, 3])
  })
})

describe('closeSnackbarIn', () => {
  it('marks only that row closed, keeping it for the animation', () => {
    expect(closeSnackbarIn([row(1), row(2)], 2)).toEqual([row(1), row(2, 'success', 'Message 2', false)])
  })

  it('changes nothing for an id that is not there', () => {
    expect(closeSnackbarIn([row(1)], 9)).toEqual([row(1)])
  })
})