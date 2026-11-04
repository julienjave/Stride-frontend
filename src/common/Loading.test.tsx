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

import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { GridSkeleton, LinesSkeleton, ListSkeleton, Loading } from './Loading'
import { LOADING_DELAY_MS } from './useDelayedShow'

// The loading states (pass 2 of the loading / error pass): nothing for the
// first 200 ms, then the sentence in a status region that was there from
// the start; skeletons draw hidden shapes beside the same sentence.
//
// The ONE file that sees the real delay: test-setup.ts turns it off for
// every other test (it says why), so it's unmocked here.
vi.unmock('./useDelayedShow')

afterEach(() => {
  vi.useRealTimers()
})

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('Loading', () => {
  it('says nothing for 200 ms, then says it — in a status region present from the start', () => {
    vi.useFakeTimers()
    render(<Loading label="Loading your patients…" />)

    const region = screen.getByRole('status')
    expect(region).toBeEmptyDOMElement()

    advance(LOADING_DELAY_MS - 1)
    expect(region).toBeEmptyDOMElement()

    advance(1)
    // The same element, now holding the sentence: a live region's content
    // CHANGED, which is what screen readers announce.
    expect(screen.getByRole('status')).toBe(region)
    expect(region).toHaveTextContent(/^Loading your patients…$/)
  })

  it('"Loading…" when it says nothing more', () => {
    vi.useFakeTimers()
    render(<Loading />)
    advance(LOADING_DELAY_MS)
    expect(screen.getByRole('status')).toHaveTextContent(/^Loading…$/)
  })

  it('a fast answer: gone before the delay, nothing was ever shown and no timer is left', () => {
    vi.useFakeTimers()
    const { unmount } = render(<Loading label="Loading clinics…" />)
    advance(LOADING_DELAY_MS / 2)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(screen.queryByText('Loading clinics…')).not.toBeInTheDocument()
  })

  it('places its region with the caller’s classes', () => {
    render(<Loading className="mx-auto mt-8" />)
    expect(screen.getByRole('status')).toHaveClass('mx-auto', 'mt-8')
  })
})

describe('ListSkeleton', () => {
  it('after the delay: the sentence for screen readers, the shapes hidden from them', () => {
    vi.useFakeTimers()
    const { container } = render(<ListSkeleton label="Loading your patients…" avatar />)
    expect(screen.getByRole('status')).toBeEmptyDOMElement()

    advance(LOADING_DELAY_MS)
    const region = screen.getByRole('status')
    // Exactly the sentence: the shapes carry no text.
    expect(region).toHaveTextContent(/^Loading your patients…$/)
    expect(screen.getByText('Loading your patients…')).toHaveClass('sr-only')

    const shapes = region.querySelector('[aria-hidden="true"]')
    expect(shapes).not.toBeNull()
    // Three rows by default, each with a round photo.
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(3)
    expect(shapes?.querySelectorAll('.animate-pulse').length).toBe(9)
  })

  it('the number of rows, and no photo unless asked', () => {
    vi.useFakeTimers()
    const { container } = render(<ListSkeleton label="Loading clinics…" rows={5} />)
    advance(LOADING_DELAY_MS)
    expect(container.querySelectorAll('.rounded-full')).toHaveLength(0)
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(10)
  })

  it("'cards': each row its own bordered card; 'rows': one frame", () => {
    vi.useFakeTimers()
    const { container, rerender } = render(<ListSkeleton label="Loading clinics…" rows={2} layout="cards" />)
    advance(LOADING_DELAY_MS)
    const frame = container.querySelector('[aria-hidden="true"] > div')
    expect(frame).toHaveClass('space-y-2')
    expect([...(frame?.children ?? [])].every((row) => row.classList.contains('rounded-lg'))).toBe(true)

    rerender(<ListSkeleton label="Loading clinics…" rows={2} />)
    const rows = container.querySelector('[aria-hidden="true"] > div')
    expect(rows).toHaveClass('divide-y', 'rounded-lg', 'border')
    expect([...(rows?.children ?? [])].some((row) => row.classList.contains('rounded-lg'))).toBe(false)
  })

  it('stops moving for people who asked for less motion', () => {
    vi.useFakeTimers()
    const { container } = render(<ListSkeleton label="Loading clinics…" rows={1} />)
    advance(LOADING_DELAY_MS)
    for (const shape of container.querySelectorAll('.animate-pulse')) {
      expect(shape).toHaveClass('motion-reduce:animate-none')
    }
  })
})

describe('LinesSkeleton', () => {
  it('lines, the last one shorter, and the sentence', () => {
    vi.useFakeTimers()
    const { container } = render(<LinesSkeleton label="Loading metrics…" lines={3} />)
    advance(LOADING_DELAY_MS)
    expect(screen.getByRole('status')).toHaveTextContent(/^Loading metrics…$/)
    const lines = [...container.querySelectorAll('.animate-pulse')]
    expect(lines.map((line) => line.classList.contains('w-1/2'))).toEqual([false, false, true])
  })
})

describe('GridSkeleton', () => {
  it('cards in the library grid’s columns, and the sentence', () => {
    vi.useFakeTimers()
    const { container } = render(<GridSkeleton label="Loading exercises…" items={4} />)
    advance(LOADING_DELAY_MS)
    expect(screen.getByRole('status')).toHaveTextContent(/^Loading exercises…$/)
    const grid = container.querySelector('[aria-hidden="true"] > div')
    expect(grid).toHaveClass('grid', 'grid-cols-2', 'sm:grid-cols-3', 'md:grid-cols-4')
    expect(grid?.children).toHaveLength(4)
  })
})