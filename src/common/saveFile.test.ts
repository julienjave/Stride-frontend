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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RELEASE_AFTER_MS, saveFile } from './saveFile'

// jsdom has no object URLs (URL.createObjectURL is undefined there) and
// doesn't download anything, so both ends are watched: the URL functions
// are stubs, and the click is caught on the link itself.

describe('saveFile', () => {
  const createObjectURL = vi.fn(() => 'blob:http://app.test/1234')
  const revokeObjectURL = vi.fn()
  let clicked: { href: string; download: string; inPage: boolean }[]

  beforeEach(() => {
    vi.useFakeTimers()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    clicked = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push({ href: this.href, download: this.download, inPage: document.body.contains(this) })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('clicks a link to the bytes, named for saving, while it is in the page — then removes it', () => {
    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' })
    saveFile(blob, 'stride-health-record-2031-03-10.pdf')

    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(clicked).toStrictEqual([
      {
        href: 'blob:http://app.test/1234',
        download: 'stride-health-record-2031-03-10.pdf',
        inPage: true,
      },
    ])
    expect(document.querySelector('a')).toBeNull()
  })

  // Released, but not at once: some browsers read the blob after the click
  // returns.
  it('releases the address after the delay, not before', () => {
    saveFile(new Blob(['x']), 'a.pdf')
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(RELEASE_AFTER_MS - 1)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://app.test/1234')
  })

  it('waits 40 seconds', () => {
    expect(RELEASE_AFTER_MS).toBe(40_000)
  })
})