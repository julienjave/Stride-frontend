import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  FONT_STORAGE_KEY,
  READABLE_FONT_CLASS,
  applyReadableFont,
  parseReadableFont,
  readStoredReadableFont,
  writeStoredReadableFont,
} from './font'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parseReadableFont', () => {
  it("is on for exactly 'readable', and off for anything else", () => {
    expect(parseReadableFont('readable')).toBe(true)
    for (const raw of [null, '', 'standard', 'Readable', 'true', ' readable']) {
      expect(parseReadableFont(raw), String(raw)).toBe(false)
    }
  })
})

describe('applyReadableFont', () => {
  it('puts the class on <html>, and takes it off again', () => {
    const html = document.documentElement
    applyReadableFont(true)
    expect(html).toHaveClass(READABLE_FONT_CLASS)
    applyReadableFont(false)
    expect(html).not.toHaveClass(READABLE_FONT_CLASS)
  })

  it('leaves the other classes on <html> alone (the theme’s `dark`)', () => {
    const html = document.documentElement
    html.classList.add('dark')
    applyReadableFont(true)
    applyReadableFont(false)
    expect(html).toHaveClass('dark')
  })
})

describe('storage', () => {
  it('remembers on as "readable", and off by removing the key', () => {
    writeStoredReadableFont(true)
    expect(localStorage.getItem(FONT_STORAGE_KEY)).toBe('readable')
    expect(readStoredReadableFont()).toBe(true)

    writeStoredReadableFont(false)
    expect(localStorage.getItem(FONT_STORAGE_KEY)).toBeNull()
    expect(readStoredReadableFont()).toBe(false)
  })

  it('is off when nothing was ever stored', () => {
    expect(readStoredReadableFont()).toBe(false)
  })

  it('reads blocked storage as off, and survives failing to write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(readStoredReadableFont()).toBe(false)
    expect(() => writeStoredReadableFont(true)).not.toThrow()
  })
})