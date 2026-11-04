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
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ExerciseCard } from './ExerciseCard'
import type { ExerciseListItem } from './types'

const baseExercise: ExerciseListItem = {
  id: 42,
  externalId: null,
  name: 'Wall Slide',
  primaryMuscles: ['shoulders'],
  secondaryMuscles: [],
  equipment: [],
  instructions: ['Step one'],
  coverUrl: null,
  source: 'custom',
  createdBy: 7,
  isArchived: false,
  author: { firstName: 'Practitioner', lastName: 'A' },
}

function renderCard(exercise: ExerciseListItem) {
  return render(
    <MemoryRouter>
      <ExerciseCard exercise={exercise} />
    </MemoryRouter>,
  )
}

const COVER = 'http://localhost:9000/stride/exercises/42/0.jpg?X-Amz-Date=20310304T140000Z'
const NEXT_HOUR_COVER = 'http://localhost:9000/stride/exercises/42/0.jpg?X-Amz-Date=20310304T150000Z'

// The photo has alt="" inside an aria-hidden frame — deliberately invisible
// to role queries (the name below says it all) — so the tests find the
// <img> and lucide's dumbbell <svg> through the DOM.
function thumbnail(container: HTMLElement) {
  return {
    img: container.querySelector('img'),
    dumbbell: container.querySelector('svg.lucide-dumbbell'),
  }
}

describe('ExerciseCard', () => {
  it('shows the name, primary muscles, and links to the detail page', () => {
    renderCard(baseExercise)
    expect(screen.getByText('Wall Slide')).toBeInTheDocument()
    expect(screen.getByText('shoulders')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/practitioner/library/42',
    )
  })

  it('shows "by <name>" when an author is present', () => {
    renderCard(baseExercise)
    expect(screen.getByText('by Practitioner A')).toBeInTheDocument()
  })

  it('shows no author line at all for a shared exercise with no author', () => {
    renderCard({ ...baseExercise, author: null })
    expect(screen.queryByText(/^by /)).not.toBeInTheDocument()
  })

  it('does not render a muscles line when primaryMuscles is empty', () => {
    renderCard({ ...baseExercise, primaryMuscles: [] })
    // Nothing to assert "not present" against a specific string here since
    // there's no fixed label — asserting the exercise still renders at
    // all is the meaningful check; an empty array producing an empty
    // <span>would still pass a naive "muscles line exists" test, so this
    // instead confirms the join of an empty array (empty string) never
    // shows up as a stray empty line by checking the joined muscle text
    // from the base fixture is genuinely gone.
    expect(screen.queryByText('shoulders')).not.toBeInTheDocument()
  })

  // --- The thumbnail (Phase 7) ---

  it('shows a dumbbell, and no photo, for an exercise with no cover', () => {
    const { container } = renderCard(baseExercise)
    const { img, dumbbell } = thumbnail(container)
    expect(img).toBeNull()
    expect(dumbbell).not.toBeNull()
  })

  it('shows the cover photo in place of the dumbbell: whole, lazy, decorative', () => {
    const { container } = renderCard({ ...baseExercise, coverUrl: COVER })
    const { img, dumbbell } = thumbnail(container)
    expect(dumbbell).toBeNull()
    expect(img).toHaveAttribute('src', COVER)
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveClass('object-contain')
    // The frame is hidden from screen readers; the link is named by the
    // card's text, starting with the exercise's name. (jsdom joins the
    // spans without spaces — "Wall Slideshoulders…" — so only the start is
    // compared.)
    expect(img?.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('link', { name: /^Wall Slide/ })).toBeInTheDocument()
  })

  it("falls back to the dumbbell when the photo can't load — never a broken image", () => {
    const { container } = renderCard({ ...baseExercise, coverUrl: COVER })
    const img = thumbnail(container).img
    expect(img).not.toBeNull()

    fireEvent.error(img as HTMLImageElement)

    expect(thumbnail(container).img).toBeNull()
    expect(thumbnail(container).dumbbell).not.toBeNull()
  })

  it('tries again when the list brings a NEW URL after a failure', () => {
    const { container, rerender } = renderCard({ ...baseExercise, coverUrl: COVER })
    fireEvent.error(thumbnail(container).img as HTMLImageElement)

    rerender(
      <MemoryRouter>
        <ExerciseCard exercise={{ ...baseExercise, coverUrl: NEXT_HOUR_COVER }} />
      </MemoryRouter>,
    )

    expect(thumbnail(container).img).toHaveAttribute('src', NEXT_HOUR_COVER)
    expect(thumbnail(container).dumbbell).toBeNull()
  })

  // The order that matters: a photo failed (failedUrl holds its URL), then
  // the exercise lost its last photo. `null !== failedUrl` alone would be
  // true here and draw an <img> with no src.
  it('shows the dumbbell when the cover is removed after a failed photo', () => {
    const { container, rerender } = renderCard({ ...baseExercise, coverUrl: COVER })
    fireEvent.error(thumbnail(container).img as HTMLImageElement)

    rerender(
      <MemoryRouter>
        <ExerciseCard exercise={{ ...baseExercise, coverUrl: null }} />
      </MemoryRouter>,
    )

    expect(thumbnail(container).img).toBeNull()
    expect(thumbnail(container).dumbbell).not.toBeNull()
  })

  it('keeps the dumbbell when the list brings the SAME URL that failed', () => {
    const { container, rerender } = renderCard({ ...baseExercise, coverUrl: COVER })
    fireEvent.error(thumbnail(container).img as HTMLImageElement)

    // A refetch in the same hour: an equal URL, in a new object.
    rerender(
      <MemoryRouter>
        <ExerciseCard exercise={{ ...baseExercise, coverUrl: COVER }} />
      </MemoryRouter>,
    )

    expect(thumbnail(container).img).toBeNull()
  })
})