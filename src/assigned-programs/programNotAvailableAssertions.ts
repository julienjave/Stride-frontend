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

// What the practitioner's four pages of one program (the program, its
// exercise, "add an exercise", its photos) show when the program's read
// answers 404 — or the address names no id (ProgramNotAvailable.tsx,
// 2026-10-23): the shared shape in the practitioner's words, with both ways
// out, and no "Try again".
export async function expectProgramNotAvailable() {
  expect(await screen.findByRole('heading', { level: 1, name: 'Program not available' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    /^This program doesn't exist, or it belongs to a patient whose care team you're not on\. Only a patient's care team can open their programs\.$/,
  )
  expect(
    screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
  ).toStrictEqual([
    ['My patients', '/practitioner/patients'],
    ['Programs', '/practitioner/programs'],
  ])
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
}

// Any other failure: the load error naming what the page shows and why
// (since 2026-10-28; a 5xx unless the test says otherwise), "Try again",
// and the way to the patients.
export async function expectProgramLoadError(what: string, reason: string = SERVER_PROBLEM_TEXT) {
  await screen.findByRole('alert')
  expect(screen.getByRole('alert').textContent).toBe(`Couldn't load ${what}. ${reason}`)
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'My patients' })).toHaveAttribute('href', '/practitioner/patients')
}