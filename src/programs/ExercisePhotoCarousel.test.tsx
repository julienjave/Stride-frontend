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

import { afterEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExercisePhotoCarousel } from './ExercisePhotoCarousel'

describe('ExercisePhotoCarousel', () => {
  it('shows "No photos yet" when there are no images', () => {
    render(<ExercisePhotoCarousel images={[]} exerciseName="Squat" />)
    expect(screen.getByText('No photos yet.')).toBeInTheDocument()
  })

  // The arrows must not be positioned with a `translate`: the shared Button
  // writes its own while pressed (`active:translate-y-px`), which would
  // REPLACE the centring one and move the button out from under the pointer
  // — the press on the arrow, the release on the photo, no click. jsdom
  // computes no layout and runs no `:active`, so this checks the cause (the
  // classes) rather than the movement; the movement was checked in Chromium.
  it('positions its arrows without a transform the press effect would replace', () => {
    render(
      <ExercisePhotoCarousel
        images={[{ url: 'https://example.com/a.jpg' }, { url: 'https://example.com/b.jpg' }]}
        exerciseName="Squat"
      />,
    )
    for (const name of ['Previous photo', 'Next photo']) {
      const arrow = screen.getByRole('button', { name })
      // The press effect really is there (else this test proves nothing)…
      expect(arrow.className).toContain('active:not-aria-[haspopup]:translate-y-px')
      // …and nothing ELSE of the arrow's own uses translate.
      const ownClasses = arrow.className.split(/\s+/).filter((c) => !c.startsWith('active:'))
      expect(ownClasses.filter((c) => c.includes('translate'))).toEqual([])
      expect(arrow).toHaveClass('inset-y-0', 'my-auto', 'h-7')
    }
  })

  it('shows the single image with no prev/next controls when there is only one', () => {
    render(
      <ExercisePhotoCarousel
        images={[{ url: 'https://example.com/a.jpg' }]}
        exerciseName="Squat"
      />,
    )
    expect(screen.getByAltText('Squat photo 1')).toHaveAttribute(
      'src',
      'https://example.com/a.jpg',
    )
    expect(
      screen.queryByRole('button', { name: 'Next photo' }),
    ).not.toBeInTheDocument()
  })

  it('navigates forward and wraps around to the first image', async () => {
    const user = userEvent.setup()
    render(
      <ExercisePhotoCarousel
        images={[
          { url: 'https://example.com/a.jpg' },
          { url: 'https://example.com/b.jpg' },
        ]}
        exerciseName="Squat"
      />,
    )
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByAltText('Squat photo 2')).toHaveAttribute(
      'src',
      'https://example.com/b.jpg',
    )
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    // Wraps back to the first image past the last one.
    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByAltText('Squat photo 1')).toBeInTheDocument()
  })

  it('navigates backward and wraps around to the last image', async () => {
    const user = userEvent.setup()
    render(
      <ExercisePhotoCarousel
        images={[
          { url: 'https://example.com/a.jpg' },
          { url: 'https://example.com/b.jpg' },
        ]}
        exerciseName="Squat"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Previous photo' }))
    expect(screen.getByAltText('Squat photo 2')).toBeInTheDocument()
  })

  it('says what the page asks when there are no images', () => {
    render(
      <ExercisePhotoCarousel
        images={[]}
        exerciseName="Squat"
        emptyText="This exercise has no photos in the library."
      />,
    )
    expect(
      screen.getByText('This exercise has no photos in the library.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('No photos yet.')).not.toBeInTheDocument()
  })

  // A program's photos are read live from the library: the list can SHRINK
  // while the carousel is open. It shows the last photo instead of reading
  // past the end (which would crash on `current.url`), and Next / Previous
  // start from the photo SHOWN, not the stale remembered position.
  it('stays on a real photo when the list shrinks, and steps from what it shows', async () => {
    const user = userEvent.setup()
    const three = ['a', 'b', 'c'].map((name) => ({
      url: `https://example.com/${name}.jpg`,
    }))
    const { rerender } = render(
      <ExercisePhotoCarousel images={three} exerciseName="Squat" />,
    )
    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    rerender(<ExercisePhotoCarousel images={three.slice(0, 2)} exerciseName="Squat" />)
    expect(screen.getByAltText('Squat photo 2')).toHaveAttribute(
      'src',
      'https://example.com/b.jpg',
    )
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    // From photo 2 of 2, Next wraps to 1 — from the remembered 3 it would
    // have gone to a 4th that doesn't exist.
    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('steps back from the photo it shows after the list shrank', async () => {
    const user = userEvent.setup()
    const three = ['a', 'b', 'c'].map((name) => ({
      url: `https://example.com/${name}.jpg`,
    }))
    const { rerender } = render(
      <ExercisePhotoCarousel images={three} exerciseName="Squat" />,
    )
    await user.click(screen.getByRole('button', { name: 'Previous photo' }))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    rerender(<ExercisePhotoCarousel images={three.slice(0, 2)} exerciseName="Squat" />)
    // Shown: 2 of 2. Previous → 1 (from the remembered 3, it would be 2).
    await user.click(screen.getByRole('button', { name: 'Previous photo' }))
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  // --- Loading, errors, preloading (the "arrow does nothing" bug) ---------
  // jsdom never downloads images: the tests fire `load` / `error` themselves.

  const urls = ['a', 'b', 'c'].map((name) => ({ url: `https://example.com/${name}.jpg` }))

  it('says it is loading until the photo has arrived', () => {
    render(<ExercisePhotoCarousel images={urls} exerciseName="Squat" />)
    expect(screen.getByText('Loading photo…')).toBeInTheDocument()

    fireEvent.load(screen.getByAltText('Squat photo 1'))
    expect(screen.queryByText('Loading photo…')).not.toBeInTheDocument()
  })

  // The bug: changing the `src` of ONE <img> kept the previous photo painted
  // until the next had downloaded. Another photo must be another element,
  // and say it's loading — never show photo 1 under "2 / 3".
  it('shows another photo in a NEW image element, loading, not the previous picture', async () => {
    const user = userEvent.setup()
    render(<ExercisePhotoCarousel images={urls} exerciseName="Squat" />)
    const first = screen.getByAltText('Squat photo 1')
    fireEvent.load(first)

    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    const second = screen.getByAltText('Squat photo 2')
    expect(second).not.toBe(first)
    expect(first).not.toBeInTheDocument()
    expect(second).toHaveAttribute('src', 'https://example.com/b.jpg')
    expect(screen.getByText('Loading photo…')).toBeInTheDocument()
  })

  it('shows a photo already seen at once, with no loading message', async () => {
    const user = userEvent.setup()
    render(<ExercisePhotoCarousel images={urls} exerciseName="Squat" />)
    fireEvent.load(screen.getByAltText('Squat photo 1'))
    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    // Photo 2 arrives too — what's remembered is EVERY photo's state, not
    // only the last one's.
    fireEvent.load(screen.getByAltText('Squat photo 2'))
    await user.click(screen.getByRole('button', { name: 'Previous photo' }))

    expect(screen.getByAltText('Squat photo 1')).toBeInTheDocument()
    expect(screen.queryByText('Loading photo…')).not.toBeInTheDocument()
  })

  // An expired signed URL (a page left open past 15 minutes) or a missing
  // file: say so, and hide the browser's broken-image icon behind it.
  it("says when a photo couldn't be loaded", () => {
    render(<ExercisePhotoCarousel images={urls} exerciseName="Squat" />)
    const photo = screen.getByAltText('Squat photo 1')
    fireEvent.error(photo)

    expect(screen.getByText("This photo couldn't be loaded.")).toBeInTheDocument()
    expect(screen.queryByText('Loading photo…')).not.toBeInTheDocument()
    expect(photo).toHaveClass('invisible')
  })

  describe('preloading', () => {
    // A stand-in for the browser's Image: records each URL asked for.
    let requested: string[]
    function stubImage() {
      requested = []
      vi.stubGlobal(
        'Image',
        class {
          set src(url: string) {
            requested.push(url)
          }
        },
      )
    }
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('fetches the next and the previous photo — the arrows wrap around', async () => {
      stubImage()
      const user = userEvent.setup()
      render(<ExercisePhotoCarousel images={urls} exerciseName="Squat" />)
      // Shown: a. Its neighbours: b (next) and c (previous, wrapping).
      expect(requested).toEqual(['https://example.com/b.jpg', 'https://example.com/c.jpg'])

      requested = []
      await user.click(screen.getByRole('button', { name: 'Next photo' }))
      // Shown: b. Its neighbours: c and a.
      expect(requested).toEqual(['https://example.com/c.jpg', 'https://example.com/a.jpg'])
    })

    it('fetches the other photo once when there are two, and nothing for one', () => {
      stubImage()
      const { rerender } = render(
        <ExercisePhotoCarousel images={urls.slice(0, 2)} exerciseName="Squat" />,
      )
      expect(requested).toEqual(['https://example.com/b.jpg'])

      requested = []
      rerender(<ExercisePhotoCarousel images={urls.slice(0, 1)} exerciseName="Squat" />)
      expect(requested).toEqual([])
    })
  })
})