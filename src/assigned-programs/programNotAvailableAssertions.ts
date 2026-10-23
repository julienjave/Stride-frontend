import { expect } from 'vitest'
import { screen } from '@testing-library/react'

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

// Any other failure: the load error naming what the page shows, "Try
// again", and the way to the patients.
export async function expectProgramLoadError(what: string) {
  expect(await screen.findByRole('alert')).toHaveTextContent(new RegExp(`^Couldn't load ${what}\\.$`))
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'My patients' })).toHaveAttribute('href', '/practitioner/patients')
}