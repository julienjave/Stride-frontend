import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMomentDate } from '@/common/formatMomentDate'
import { PAT_USER, renderMedicalFile, requests } from './renderMedicalFile'
import { chainedFile, json } from './testData'
import { expectSkeleton } from '@/common/loadingAssertions'

const FILE_PATH = '/practitioner/patients/6/medical-file'

// The usual answers: the patient, and their file (or `file` / `fileStatus`).
function answers(file: unknown = chainedFile(), fileStatus = 200) {
  return ({ method, path }: { method: string; path: string }) => {
    if (method === 'GET' && path === '/users/6') return json(PAT_USER)
    if (method === 'GET' && path === '/medical-files?patientId=6') {
      return fileStatus === 200
        ? json(file)
        : json({ statusCode: fileStatus, message: ['Refused'], error: 'Error' }, fileStatus)
    }
    return undefined
  }
}

// A note's card: the article named by its heading.
async function note(heading: RegExp) {
  return screen.findByRole('article', { name: heading })
}

describe('MedicalFilePage', () => {
  it("shows the file's notes newest first — type, day, author, the sections written — and reads it once", async () => {
    renderMedicalFile([FILE_PATH], answers())

    const list = await screen.findByRole('list', { name: 'Entries' })
    // Three notes (the chain 2 → 3 → 4 is ONE note), headed by their latest version.
    expect(
      within(list)
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual([
      `Progress note · ${formatMomentDate('2031-03-20T09:00:00.000Z')}`,
      `Progress note · ${formatMomentDate('2031-03-12T11:00:00.000Z')}`,
      `Initial assessment · ${formatMomentDate('2031-03-01T09:00:00.000Z')}`,
    ])

    const first = await note(/^Initial assessment/)
    expect(within(first).getByText('Written by Sam Okafor')).toBeInTheDocument()
    expect(within(first).getAllByRole('term').map((t) => t.textContent)).toEqual([
      'Subjective',
      'Objective',
      'Assessment',
      'Plan',
    ])
    expect(within(first).getByText('Patellofemoral pain')).toBeInTheDocument()

    // Only the sections that were written.
    const newest = await note(new RegExp(formatMomentDate('2031-03-20T09:00:00.000Z')))
    expect(within(newest).getAllByRole('term').map((t) => t.textContent)).toEqual(['Subjective', 'Plan'])

    // One read of the file (the audited one), and the patient's name.
    expect(requests().map((r) => `${r.method} ${r.path}`).sort()).toEqual([
      'GET /medical-files?patientId=6',
      'GET /users/6',
    ])
  })

  it('folds the earlier versions of a note under its latest, behind a toggle', async () => {
    const user = userEvent.setup()
    renderMedicalFile([FILE_PATH], answers())

    const corrected = await note(new RegExp(formatMomentDate('2031-03-12T11:00:00.000Z')))
    expect(
      within(corrected).getByText(`Amends the entry of ${formatMomentDate('2031-03-11T11:00:00.000Z')}: Measured again`),
    ).toBeInTheDocument()
    expect(within(corrected).getByText('Right knee flexion 125°')).toBeInTheDocument()
    // The older texts aren't on the page until asked for.
    expect(screen.queryByText('Right knee flexion 120°')).not.toBeInTheDocument()
    expect(screen.queryByText('Left knee flexion 120°')).not.toBeInTheDocument()

    const toggle = within(corrected).getByRole('button', { name: 'Show the 2 earlier versions' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveTextContent('Hide the 2 earlier versions')

    const earlier = within(corrected).getByRole('list', { name: 'Earlier versions' })
    expect(toggle).toHaveAttribute('aria-controls', earlier.id)
    const versions = within(earlier).getAllByRole('article')
    expect(versions).toHaveLength(2)
    // Newest first; each dated by the version that replaced it.
    expect(within(versions[0]).getByText(`Amended on ${formatMomentDate('2031-03-12T11:00:00.000Z')}`)).toBeInTheDocument()
    expect(within(versions[0]).getByText('Right knee flexion 120°')).toBeInTheDocument()
    expect(
      within(versions[0]).getByText(`Amends the entry of ${formatMomentDate('2031-03-11T09:00:00.000Z')}: Wrong knee recorded`),
    ).toBeInTheDocument()
    expect(within(versions[1]).getByText(`Amended on ${formatMomentDate('2031-03-11T11:00:00.000Z')}`)).toBeInTheDocument()
    expect(within(versions[1]).getByText('Left knee flexion 120°')).toBeInTheDocument()
    // The original amends nothing.
    expect(within(versions[1]).queryByText(/^Amends the entry/)).not.toBeInTheDocument()
    expect(within(earlier).getAllByRole('heading', { level: 3 })).toHaveLength(2)

    await user.click(toggle)
    expect(screen.queryByRole('list', { name: 'Earlier versions' })).not.toBeInTheDocument()
    expect(toggle).toHaveTextContent('Show the 2 earlier versions')
  })

  it('offers no toggle on a note that was never amended', async () => {
    renderMedicalFile([FILE_PATH], answers())
    const first = await note(/^Initial assessment/)
    expect(within(first).queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers "Amend" on the latest version of each note only, and "Add an entry"', async () => {
    renderMedicalFile([FILE_PATH], answers())
    await screen.findByRole('list', { name: 'Entries' })

    expect(screen.getAllByRole('link', { name: /^Amend: / }).map((a) => a.getAttribute('href'))).toEqual([
      '/practitioner/patients/6/medical-file/new?amends=5',
      '/practitioner/patients/6/medical-file/new?amends=4',
      '/practitioner/patients/6/medical-file/new?amends=1',
    ])
    expect(screen.getByRole('link', { name: 'Add an entry' })).toHaveAttribute(
      'href',
      '/practitioner/patients/6/medical-file/new',
    )
    expect(await screen.findByRole('link', { name: '← Pat Lee' })).toHaveAttribute('href', '/practitioner/patients/6')
  })

  it('says when the file is empty — and only then', async () => {
    renderMedicalFile([FILE_PATH], answers([]))
    expect(await screen.findByText(/^No entries yet/)).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Entries' })).not.toBeInTheDocument()
  })

  it("doesn't say the file is empty while it loads, or once it has entries", async () => {
    renderMedicalFile([FILE_PATH], answers())
    expectSkeleton('Loading the medical file…')
    expect(screen.queryByText(/^No entries yet/)).not.toBeInTheDocument()
    await screen.findByRole('list', { name: 'Entries' })
    expect(screen.queryByText(/^No entries yet/)).not.toBeInTheDocument()
    expect(screen.queryByText('Loading the medical file…')).not.toBeInTheDocument()
  })

  it("explains a 403 — not on the care team — with nothing about the patient's file", async () => {
    renderMedicalFile([FILE_PATH], answers([], 403))
    expect(await screen.findByRole('heading', { name: "You're not on this patient's care team" })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add an entry' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My patients' })).toHaveAttribute('href', '/practitioner/patients')
  })

  it('says when the file could not be loaded — and "Try again" asks again', async () => {
    const user = userEvent.setup()
    let status = 500
    renderMedicalFile([FILE_PATH], (request) => answers([], status)(request))
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't load the medical file\. Something went wrong on our side\. Try again in a moment\.$/)
    expect(screen.queryByText(/^No entries yet/)).not.toBeInTheDocument()
    status = 200
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/^No entries yet/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Medical file' })).toHaveFocus(),
    )
  })

  it('refuses an address without a valid patient', () => {
    renderMedicalFile(['/practitioner/patients/abc/medical-file'], () => undefined)
    expect(screen.getByText('Invalid patient.')).toBeInTheDocument()
    expect(requests()).toEqual([])
  })
})