import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMomentDate } from '@/common/formatMomentDate'
import { renderMedicalFile, requests } from './renderMedicalFile'
import { chainedFile, json } from './testData'
import { expectSkeleton } from '@/common/loadingAssertions'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { catalogue, patRecord } from '@/range-of-motion/testData'

const PATH = '/profile/records'

// The page's requests: the file; (since 2026-10-28) the times the record was
// shared outside the clinic — none, unless a test says otherwise; and (since
// 2026-10-31, decisions §36) the range of motion and its catalogue — none
// measured, unless a test says otherwise.
function answers(file: unknown = chainedFile(), status = 200, shared: unknown = [], rom: unknown = [], romStatus = 200) {
  return ({ method, path }: { method: string; path: string }) =>
    method !== 'GET'
      ? undefined
      : path === '/legal-disclosures'
        ? json(shared)
        : path === '/range-of-motion/movements'
          ? json(catalogue())
          : path === '/range-of-motion'
            ? romStatus === 200
              ? json(rom)
              : json({ statusCode: romStatus, message: ['Boom'], error: 'Error' }, romStatus)
            : path === '/medical-files'
              ? status === 200
                ? json(file)
                : json({ statusCode: status, message: ['Boom'], error: 'Error' }, status)
              : undefined
}

describe('MyRecordsPage', () => {
  it("shows the patient's whole file in their words, read-only, from ONE request for it naming nobody", async () => {
    const user = userEvent.setup()
    renderMedicalFile([PATH], answers(), 'patient')

    const first = await screen.findByRole('article', { name: /^Initial assessment/ })
    expect(within(first).getAllByRole('term').map((t) => t.textContent)).toEqual([
      'What you reported',
      'What was observed',
      'Assessment',
      'Plan',
    ])
    const corrected = screen.getByRole('article', {
      name: new RegExp(formatMomentDate('2031-03-12T11:00:00.000Z')),
    })
    expect(
      within(corrected).getByText(`Corrects the entry of ${formatMomentDate('2031-03-11T11:00:00.000Z')}: Measured again`),
    ).toBeInTheDocument()
    // The earlier versions are the patient's to read too.
    await user.click(within(corrected).getByRole('button', { name: 'Show the 2 earlier versions' }))
    expect(within(corrected).getByText('Left knee flexion 120°')).toBeInTheDocument()

    expect(screen.queryByRole('link', { name: /Amend/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Record measurements/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add an entry' })).not.toBeInTheDocument()
    // The file in one request; the shared list and the range of motion in
    // their own (in no set order) — every one naming nobody.
    expect(requests().map((r) => `${r.method} ${r.path}`).sort()).toEqual([
      'GET /legal-disclosures',
      'GET /medical-files',
      'GET /range-of-motion',
      'GET /range-of-motion/movements',
    ])
  })

  it('says what the records are, and leads back to the profile', async () => {
    renderMedicalFile([PATH], answers(), 'patient')
    expect(screen.getByRole('heading', { level: 1, name: 'My records' })).toBeInTheDocument()
    expect(screen.getByText(/a correction is added as a new version, and the original stays visible/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← My profile' })).toHaveAttribute('href', '/profile')
    await screen.findByRole('list', { name: 'Entries' })
  })

  it('says when nothing has been written yet — and only then', async () => {
    renderMedicalFile([PATH], answers([]), 'patient')
    expect(await screen.findByText("Your practitioners haven't written anything in your file yet.")).toBeInTheDocument()
    expect(screen.queryByText('Loading your records…')).not.toBeInTheDocument()
  })

  it("doesn't say the file is empty while it loads", async () => {
    renderMedicalFile([PATH], answers(), 'patient')
    expectSkeleton('Loading your records…')
    expect(screen.queryByText(/haven't written anything/)).not.toBeInTheDocument()
    await screen.findByRole('list', { name: 'Entries' })
    expect(screen.queryByText(/haven't written anything/)).not.toBeInTheDocument()
  })

  it('says when the records could not be loaded — and "Try again" asks again', async () => {
    const user = userEvent.setup()
    let status = 500
    renderMedicalFile([PATH], (request) => answers([], status)(request), 'patient')
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't load your records\. Something went wrong on our side\. Try again in a moment\.$/)
    expect(screen.queryByText(/haven't written anything/)).not.toBeInTheDocument()
    status = 200
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/haven't written anything/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'My records' })).toHaveFocus(),
    )
  })

  // Decisions §25, pass 3: the accounting of disclosures, below the notes —
  // its own request, shown whatever the file's list does.
  it('lists the times the record was shared outside the clinic, below the notes', async () => {
    const shared = [
      {
        id: 21,
        madeAt: '2031-06-10T12:00:00.000Z',
        recipientName: 'Jane Roe',
        recipientOrganisation: 'Montreal Police',
        legalBasis: 'court_order',
        basisExplanation: null,
        parts: ['medical_file', 'messages'],
        periodFrom: null,
        periodTo: null,
      },
    ]
    renderMedicalFile([PATH], answers([], 500, shared), 'patient')
    const section = await screen.findByRole('region', { name: 'When your record was shared' })
    const [line] = within(
      await within(section).findByRole('list', { name: 'Times your record was shared' }),
    ).getAllByRole('listitem')
    expect(line).toHaveTextContent(`${formatMomentDate('2031-06-10T12:00:00.000Z')} · Jane Roe (Montreal Police)`)
    // Below the notes' part of the page, which failed on its own.
    const failed = await screen.findByText(/^Couldn't load your records\./)
    expect(failed.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  // Decisions §36: the range of motion, under the notes — the practitioner's
  // movement cards, read-only, the typical value worded as a guide.
  describe('the range of motion', () => {
    it('shows the movement cards and every assessment, read-only, the typical value as a guide', async () => {
      const user = userEvent.setup()
      renderMedicalFile([PATH], answers(chainedFile(), 200, [], patRecord()), 'patient')
      const section = await screen.findByRole('region', { name: 'Range of motion' })
      expect(
        within(section).getByText(
          'How far your joints moved when your care team measured them, in degrees. The typical value is a textbook guide, not a target: people differ, and your other side is often the better comparison.',
        ),
      ).toBeInTheDocument()
      const card = await within(section).findByRole('article', { name: 'Knee flexion · active' })
      expect(within(card).getByText('Typical: 135° (a guide, not a target)')).toBeInTheDocument()
      expect(within(section).getByRole('heading', { level: 3, name: 'Each assessment' })).toBeInTheDocument()
      const assessments = within(section).getByRole('list', { name: 'Assessments' })
      expect(within(assessments).getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
        `Measured ${formatCalendarDate('2031-03-20')}`,
        `Measured ${formatCalendarDate('2031-03-11')}`,
        `Measured ${formatCalendarDate('2031-03-01')}`,
      ])
      // The patient's word for an amendment, and its original theirs to read.
      const corrected = within(assessments).getAllByRole('article')[1]
      expect(corrected).toHaveTextContent(`Corrects the measurements of ${formatCalendarDate('2031-03-11')}`)
      await user.click(within(corrected).getByRole('button', { name: 'Show the original' }))
      expect(within(corrected).getByRole('heading', { level: 5 })).toBeInTheDocument()
      // The note a measurement is linked to, named from the file the page read.
      expect(within(section).getAllByText(/^Visit note: Initial assessment/)).toHaveLength(1)
      // Read-only: nothing to record or amend.
      expect(within(section).queryByRole('link')).not.toBeInTheDocument()
    })

    it('says when nothing has been measured', async () => {
      renderMedicalFile([PATH], answers(), 'patient')
      const section = await screen.findByRole('region', { name: 'Range of motion' })
      expect(await within(section).findByText("Your care team hasn't measured any joints yet.")).toBeInTheDocument()
      expect(within(section).queryByRole('list', { name: 'Movements' })).not.toBeInTheDocument()
    })

    it('fails on its own, below the notes, with its own "Try again"', async () => {
      renderMedicalFile([PATH], answers(chainedFile(), 200, [], [], 500), 'patient')
      const section = await screen.findByRole('region', { name: 'Range of motion' })
      expect(await within(section).findByRole('alert')).toHaveTextContent(/^Couldn't load your range of motion\./)
      expect(within(section).getByRole('button', { name: 'Try again' })).toBeInTheDocument()
      // The notes are there all the same.
      expect(screen.getByRole('list', { name: 'Entries' })).toBeInTheDocument()
    })
  })
})