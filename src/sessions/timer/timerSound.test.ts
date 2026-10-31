import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  TIMER_SOUND_STORAGE_KEY,
  parseTimerSound,
  readTimerSound,
  sharedBeeper,
  writeTimerSound,
} from './timerSound'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('the timer sound preference', () => {
  it('on unless it was switched off — anything unknown is the default', () => {
    expect(parseTimerSound('off')).toBe(false)
    expect(parseTimerSound('on')).toBe(true)
    expect(parseTimerSound(null)).toBe(true)
    expect(parseTimerSound('OFF')).toBe(true)
  })

  it('written and read back under its own key', () => {
    writeTimerSound(false)
    expect(localStorage.getItem(TIMER_SOUND_STORAGE_KEY)).toBe('off')
    expect(readTimerSound()).toBe(false)
    writeTimerSound(true)
    expect(localStorage.getItem(TIMER_SOUND_STORAGE_KEY)).toBe('on')
    expect(readTimerSound()).toBe(true)
  })

  it('storage that throws: read as the default, a write quietly not remembered', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(readTimerSound()).toBe(true)
    expect(() => writeTimerSound(false)).not.toThrow()
  })

  it('one beeper for the whole app', () => {
    expect(sharedBeeper()).toBe(sharedBeeper())
  })
})