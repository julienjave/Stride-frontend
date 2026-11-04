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

import { expect, type Mock } from 'vitest'
import { screen, within } from '@testing-library/react'

// What a test checks of a loading state (Phase 6, the loading / error pass,
// pass 2): a status region — so a screen reader hears it — holding exactly
// the sentence; for a skeleton, its shapes too, hidden from screen readers.
// (The 200 ms delay is off in tests — test-setup.ts says why — so the state
// is there at once.)
//
// `container`: the section to look in, when the page has several loading
// states (the admin home's two sections).

function loadingRegion(label: string, container?: HTMLElement): HTMLElement {
  const scope = container ? within(container) : screen
  // The sentence's region: the status whose text is exactly the sentence
  // (a page may hold other status regions — a notice, a count).
  const region = scope.getAllByRole('status').find((element) => element.textContent === label)
  expect(region, `a status region saying "${label}"`).toBeDefined()
  return region!
}

// A sentence: "Loading the clinic…", shown as text.
export function expectLoading(label: string, container?: HTMLElement) {
  const region = loadingRegion(label, container)
  expect(region.querySelector('[aria-hidden="true"]')).toBeNull()
}

// A skeleton: the sentence for screen readers only, and grey shapes.
export function expectSkeleton(label: string, container?: HTMLElement) {
  const region = loadingRegion(label, container)
  expect(within(region).getByText(label)).toHaveClass('sr-only')
  const shapes = region.querySelector('[aria-hidden="true"]')
  expect(shapes?.querySelector('.animate-pulse')).not.toBeNull()
}

// Holds the requests whose address `matches` — they never answer — while
// the test's fake backend answers the others: the page's other parts load,
// and the held part stays in its loading state for the test to look at.
export function holdRequests(fetchMock: Mock<typeof fetch>, matches: (url: string) => boolean) {
  const answered = fetchMock.getMockImplementation()
  fetchMock.mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (matches(url)) return new Promise<Response>(() => {})
    if (!answered) return Promise.reject(new Error(`unexpected request: ${url}`))
    return answered(input, init)
  })
}