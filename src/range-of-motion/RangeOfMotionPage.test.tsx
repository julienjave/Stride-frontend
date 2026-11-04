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

import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatDayMonth, formatShortDate } from '@/common/calendarDate'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatMomentDate } from '@/common/formatMomentDate'
import { expectSkeleton } from '@/common/loadingAssertions'
import { entry, json } from '@/medical-files/testData'
import { renderRangeOfMotion, requestLines, standardAnswers } from './renderRangeOfMotion'
import { assessment, patRecord, value } from './testData'
import type { RomAssessment } from './types'

const PAGE = '/practitioner/patients/6/range-of-motion'

// The patient's medical file, as the page reads it to name the linked notes.
const NOTES = [
  entry(2, { createdAt: '2031-03-11T09:00:00.000Z' }),
  entry(1, { entryType: 'initial_assessment', createdAt: '2031-03-01T09:00:00.000Z' }),
]

function answers(record: unknown = patRecord(), status = 200) {
  return standardAnswers(({ method, path }) => {
    if (method === 'GET' && path === '/range-of-motion?patientId=6') {
      return status === 200 ? json(record) : json({ statusCode: status, message: ['Refused'], error: 'Error' }, status)
    }
    if (method === 'GET' && path === '/medical-files?patientId=6') return json(NOTES)
    return undefined
  })
}

describe('RangeOfMotionPage', () => {
  it('shows a card per movement and mode: the latest value of each side, the change, the typical value', async () => {
    renderRangeOfMotion([PAGE], answers())
    const movements = await screen.findByRole('list', { name: 'Movements' })
    expect(
      within(movements)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toStrictEqual(['Knee flexion · active', 'Knee flexion · passive'])

    const active = screen.getByRole('article', { name: 'Knee flexion · active' })
    const lines = within(active)
      .getAllByRole('definition')
      .map((d) => d.textContent)
    const day = formatDayMonth('2031-03-20')
    const first = formatDayMonth('2031-03-01')
    // Each side: value, day, and the change (shown, then said in words).
    expect(lines).toStrictEqual([
      `139°${day}↑ 1° since ${first}1° more than on ${first}`,
      `126°${day}↑ 16° since ${first}16° more than on ${first}`,
    ])
    expect(within(active).getAllByRole('term').map((t) => t.textContent)).toStrictEqual(['Left', 'Right'])
    expect(within(active).getByText('Typical 135°')).toBeInTheDocument()

    // One value only (the passive right knee): no change to speak of.
    const passive = screen.getByRole('article', { name: 'Knee flexion · passive' })
    expect(within(passive).getAllByRole('definition').map((d) => d.textContent)).toStrictEqual([
      `118°${formatDayMonth('2031-03-01')}`,
    ])
  })

  it("draws each side's values over the days measured, the amended value left out", async () => {
    renderRangeOfMotion([PAGE], answers())
    const active = await screen.findByRole('article', { name: 'Knee flexion · active' })
    const svg = active.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    const values = (side: string) =>
      [...active.querySelectorAll(`[data-side="${side}"] [data-point]`)].map((p) => p.getAttribute('data-point'))
    expect(values('left')).toStrictEqual(['138', '138', '139'])
    expect(values('right')).toStrictEqual(['110', '120', '126'])
    // Left round, right square: the shape says the side too.
    expect(active.querySelectorAll('[data-side="left"] circle')).toHaveLength(3)
    expect(active.querySelectorAll('[data-side="right"] rect')).toHaveLength(3)
    expect(active.querySelector('[data-typical]')).toHaveAttribute('data-typical', '135')
    // The key names only the sides there are.
    const passive = screen.getByRole('article', { name: 'Knee flexion · passive' })
    expect(within(passive).queryByText('Left', { ignore: 'dt' })).not.toBeInTheDocument()
  })

  it('gives every value as text in the table twin, newest first, a dash where a side was not measured', async () => {
    const user = userEvent.setup()
    const record = [
      assessment(2, { measuredOn: '2031-03-08', measurements: [value('knee_flexion', 'left', 130)] }),
      assessment(1, {
        measuredOn: '2031-03-01',
        measurements: [value('knee_flexion', 'left', 120), value('knee_flexion', 'right', -5)],
      }),
    ]
    renderRangeOfMotion([PAGE], answers(record))
    const card = await screen.findByRole('article', { name: 'Knee flexion · active' })
    await user.click(within(card).getByText('Show the values as a table'))
    const rows = within(within(card).getByRole('table')).getAllByRole('row')
    expect(rows.map((row) => [...row.querySelectorAll('th, td')].map((c) => c.textContent))).toStrictEqual([
      ['Measured', 'Left', 'Right'],
      [formatShortDate('2031-03-08'), '130°', '—Not measured'],
      [formatShortDate('2031-03-01'), '120°', '−5°'],
    ])
  })

  it('lists the assessments newest measured first — author, count, visit note, the correction folded in', async () => {
    const user = userEvent.setup()
    renderRangeOfMotion([PAGE], answers())
    const list = await screen.findByRole('list', { name: 'Assessments' })
    expect(
      within(list)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toStrictEqual([
      `Measured ${formatCalendarDate('2031-03-20')}`,
      `Measured ${formatCalendarDate('2031-03-11')}`,
      `Measured ${formatCalendarDate('2031-03-01')}`,
    ])
    const [newest, corrected, first] = within(list).getAllByRole('article')
    expect(newest).toHaveTextContent(
      `By Alex Chen · 2 values · recorded ${formatMomentDate('2031-03-21T08:15:00.000Z')}`,
    )
    // The linked note, named from the medical file.
    expect(
      await within(first).findByText(`Visit note: Initial assessment · ${formatMomentDate('2031-03-01T09:00:00.000Z')}`),
    ).toBeInTheDocument()
    expect(first).toHaveTextContent('Knee flexion, right, passive118°pain at end range')
    expect(corrected).toHaveTextContent(
      `Amends the measurements of ${formatCalendarDate('2031-03-11')}: Typed as 102°; it measured 120°.`,
    )
    // The value it corrected stays folded until asked for.
    expect(corrected).not.toHaveTextContent('Knee flexion, right, active102°')
    await user.click(within(corrected).getByRole('button', { name: 'Show the original' }))
    const earlier = within(corrected).getByRole('list', { name: 'Earlier versions' })
    expect(earlier).toHaveTextContent(`Amended on ${formatMomentDate('2031-03-11T11:20:00.000Z')}`)
    expect(earlier).toHaveTextContent('Knee flexion, right, active102°')
  })

  it('offers Amend on each latest version only, and Record an assessment', async () => {
    renderRangeOfMotion([PAGE], answers())
    await screen.findByRole('list', { name: 'Assessments' })
    expect(screen.getAllByRole('link', { name: /^Amend:/ }).map((l) => l.getAttribute('href'))).toStrictEqual([
      `${PAGE}/new?amends=4`,
      `${PAGE}/new?amends=3`,
      `${PAGE}/new?amends=1`,
    ])
    expect(screen.getByRole('link', { name: 'Record an assessment' })).toHaveAttribute('href', `${PAGE}/new`)
    expect(screen.getByRole('link', { name: '← Pat Lee' })).toHaveAttribute('href', '/practitioner/patients/6')
  })

  it('reads the record once, and the medical file only when an assessment is linked to a note', async () => {
    renderRangeOfMotion([PAGE], answers())
    await screen.findByText(/^Visit note: Initial assessment/)
    expect(requestLines().sort()).toStrictEqual([
      'GET /medical-files?patientId=6',
      'GET /range-of-motion/movements',
      'GET /range-of-motion?patientId=6',
      'GET /users/6',
    ])
  })

  it("doesn't read the medical file when nothing is linked", async () => {
    renderRangeOfMotion([PAGE], answers([assessment(1)]))
    await screen.findByRole('list', { name: 'Assessments' })
    expect(requestLines()).not.toContain('GET /medical-files?patientId=6')
  })

  it('still lists a linked assessment when the medical file cannot be read — the note just unnamed', async () => {
    renderRangeOfMotion(
      [PAGE],
      standardAnswers(({ path }) => {
        if (path === '/range-of-motion?patientId=6') return json([assessment(1, { medicalFileEntryId: 9 })])
        if (path === '/medical-files?patientId=6') return json({ statusCode: 500, message: ['x'], error: 'x' }, 500)
        return undefined
      }),
    )
    expect(await screen.findByText('Visit note: a note of the medical file')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says when nothing has been measured — and not while loading', async () => {
    renderRangeOfMotion([PAGE], answers([]))
    expectSkeleton('Loading the range of motion…')
    expect(screen.queryByText(/No measurements yet/)).not.toBeInTheDocument()
    expect(
      await screen.findByText('No measurements yet. Record the first assessment after measuring a joint.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Movements' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Assessments' })).not.toBeInTheDocument()
  })

  it('explains a page off the care team, naming no one', async () => {
    renderRangeOfMotion([PAGE], answers([], 403))
    expect(
      await screen.findByRole('heading', { level: 1, name: "You're not on this patient's care team" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Only a patient's care team can open their range of motion.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My patients' })).toHaveAttribute('href', '/practitioner/patients')
    expect(screen.queryByText('Pat Lee')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Record an assessment' })).not.toBeInTheDocument()
  })

  it('says when the record could not be loaded — and "Try again" asks again', async () => {
    const user = userEvent.setup()
    let status = 500
    renderRangeOfMotion([PAGE], (request) => answers([], status)(request))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Couldn't load the range of motion\. Something went wrong on our side\. Try again in a moment\.$/,
    )
    status = 200
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/No measurements yet/)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 1, name: 'Range of motion' })).toHaveFocus())
  })

  it('says it when the list of movements could not be loaded', async () => {
    renderRangeOfMotion(
      [PAGE],
      standardAnswers(({ path }) => {
        if (path === '/range-of-motion/movements') return json({ statusCode: 500, message: ['x'], error: 'x' }, 500)
        if (path === '/range-of-motion?patientId=6') return json([] satisfies RomAssessment[])
        return undefined
      }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't load the range of motion\./)
  })

  it('refuses an address that is no patient id, asking nothing', () => {
    renderRangeOfMotion(['/practitioner/patients/abc/range-of-motion'], answers())
    expect(screen.getByText('Invalid patient.')).toBeInTheDocument()
    expect(requestLines()).toStrictEqual([])
  })
})