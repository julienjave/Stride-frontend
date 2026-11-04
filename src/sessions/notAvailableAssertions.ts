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

import { expect } from 'vitest'
import { screen } from '@testing-library/react'
import { SERVER_PROBLEM_TEXT } from '@/api/apiErrors'

// What every patient page of a program or session shows when the backend
// answers 404 (or the address names no id): the shared "not available" shape
// in the patient's words (SessionPageParts.NotAvailable, 2026-10-23) — and no
// "Try again", since asking again can't change that answer. The links are
// checked once, in SessionPage.test.tsx.
export async function expectNotAvailable(what: 'program' | 'session') {
  const title = what === 'program' ? 'Program not available' : 'Session not available'
  expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    new RegExp(`^This ${what} doesn't exist, or it isn't one of yours\\.$`),
  )
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
}

// The other failures: the load error — with its reason (since 2026-10-28; a
// 5xx unless the test says otherwise) — "Try again" and the way home.
export async function expectLoadError(what: 'program' | 'session', reason: string = SERVER_PROBLEM_TEXT) {
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).toBe(`Couldn't load this ${what}. ${reason}`)
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/patient')
}