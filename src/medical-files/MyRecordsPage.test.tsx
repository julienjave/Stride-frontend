import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMomentDate } from '@/common/formatMomentDate'
import { renderMedicalFile, requests } from './renderMedicalFile'
import { chainedFile, json } from './testData'

const PATH = '/profile/records'

function answers(file: unknown = chainedFile(), status = 200) {
  return ({ method, path }: { method: string; path: string }) =>
    method === 'GET' && path === '/medical-files'
      ? status === 200
        ? json(file)
        : json({ statusCode: status, message: ['Boom'], error: 'Error' }, status)
      : undefined
}

describe('MyRecordsPage', () => {
  it("shows the patient's whole file in their words, read-only, from ONE request naming nobody", async () => {
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
    expect(screen.queryByRole('link', { name: 'Add an entry' })).not.toBeInTheDocument()
    expect(requests().map((r) => `${r.method} ${r.path}`)).toEqual(['GET /medical-files'])
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
    expect(screen.getByText('Loading your records…')).toBeInTheDocument()
    expect(screen.queryByText(/haven't written anything/)).not.toBeInTheDocument()
    await screen.findByRole('list', { name: 'Entries' })
    expect(screen.queryByText(/haven't written anything/)).not.toBeInTheDocument()
  })

  it('says when the records could not be loaded — and "Try again" asks again', async () => {
    const user = userEvent.setup()
    let status = 500
    renderMedicalFile([PATH], (request) => answers([], status)(request), 'patient')
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't load your records\.$/)
    expect(screen.queryByText(/haven't written anything/)).not.toBeInTheDocument()
    status = 200
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText(/haven't written anything/)).toBeInTheDocument()
  })
})