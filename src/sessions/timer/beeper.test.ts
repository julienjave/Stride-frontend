import { describe, it, expect, vi } from 'vitest'
import { createBeeper } from './beeper'

// The beep, against a FAKE AudioContext (jsdom has no Web Audio): it records
// what a real one would be asked to play — how many tones, when, how loud.

function fakeContextClass({
  state = 'running',
  throws = false,
}: { state?: AudioContextState; throws?: boolean } = {}) {
  const made: FakeContext[] = []
  class FakeContext {
    state = state
    currentTime = 10
    destination = {}
    resume = vi.fn(() => Promise.resolve())
    oscillators: { start: number; stop: number; frequency: number }[] = []
    constructor() {
      if (throws) throw new Error('too many contexts')
      made.push(this)
    }
    createOscillator() {
      const record = { start: NaN, stop: NaN, frequency: NaN }
      this.oscillators.push(record)
      const oscillator = {
        type: '',
        frequency: {
          set value(hz: number) {
            record.frequency = hz
          },
        },
        connect: (node: unknown) => node,
        start: (at: number) => {
          record.start = at
        },
        stop: (at: number) => {
          record.stop = at
        },
      }
      return oscillator
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: (node: unknown) => node,
      }
    }
  }
  return { Context: FakeContext as unknown as new () => AudioContext, made }
}

describe('createBeeper', () => {
  it('nothing plays before unlock — no context exists until a tap creates it', () => {
    const { Context, made } = fakeContextClass()
    const beeper = createBeeper(Context)
    beeper.beep('all_done')
    expect(made).toHaveLength(0)
  })

  it('unlock creates ONE context, however often it is called', () => {
    const { Context, made } = fakeContextClass()
    const beeper = createBeeper(Context)
    beeper.unlock()
    beeper.unlock()
    expect(made).toHaveLength(1)
  })

  it('a suspended context (no tap yet, or the phone suspended it) is resumed by unlock', () => {
    const { Context, made } = fakeContextClass({ state: 'suspended' })
    createBeeper(Context).unlock()
    expect(made[0].resume).toHaveBeenCalledTimes(1)
  })

  it('a running context is not resumed again', () => {
    const { Context, made } = fakeContextClass()
    createBeeper(Context).unlock()
    expect(made[0].resume).not.toHaveBeenCalled()
  })

  it('a set: two 880 Hz beeps of 0.15 s, 0.12 s apart, from the context clock', () => {
    const { Context, made } = fakeContextClass()
    const beeper = createBeeper(Context)
    beeper.unlock()
    beeper.beep('set_done')
    expect(made[0].oscillators).toStrictEqual([
      { start: 10, stop: 10.15, frequency: 880 },
      { start: 10.27, stop: 10.42, frequency: 880 },
    ])
  })

  it('the last set: three beeps', () => {
    const { Context, made } = fakeContextClass()
    const beeper = createBeeper(Context)
    beeper.unlock()
    beeper.beep('all_done')
    expect(made[0].oscillators.map((o) => o.start)).toStrictEqual([10, 10.27, 10.54])
  })

  it('no Web Audio in the browser: silent, never an error', () => {
    const beeper = createBeeper(undefined)
    expect(() => {
      beeper.unlock()
      beeper.beep('all_done')
    }).not.toThrow()
  })

  it('a context that cannot be created: silent, never an error', () => {
    const { Context } = fakeContextClass({ throws: true })
    const beeper = createBeeper(Context)
    expect(() => {
      beeper.unlock()
      beeper.beep('all_done')
    }).not.toThrow()
  })
})