import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMomentDate } from '@/common/formatMomentDate'
import { PAT_USER, renderMedicalFile, requests, type SentRequest } from './renderMedicalFile'
import { chainedFile, entry, json } from './testData'
import type { MedicalFileEntry } from './types'
import { expectLoading } from '@/common/loadingAssertions'

// An entry the page can't show (2026-10-23): the shared "not available"
// shape, both possibilities, and the way back to the file — no "Try again".
async function expectEntryNotAvailable() {
  expect(await screen.findByRole('heading', { level: 1, name: 'Entry not available' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    /^This entry doesn't exist, or it isn't in this patient's medical file\.$/,
  )
  expect(screen.getByRole('link', { name: 'Back to the medical file' })).toHaveAttribute(
    'href',
    '/practitioner/patients/6/medical-file',
  )
  expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
}

const NEW_PATH = '/practitioner/patients/6/medical-file/new'
const FILE_PATH = '/practitioner/patients/6/medical-file'
const PATIENT_PATH = '/practitioner/patients/6'

const NO_TYPE = 'Choose the type of entry.'
const NO_SECTION = 'Write at least one section: Subjective, Objective, Assessment or Plan.'
const NO_REASON = 'Say why you are amending this entry.'
const UNCHANGED = 'Nothing has changed yet: correct the entry before saving the amendment.'

// The usual answers. `post` decides the POST's answer (default: 201 with the
// stored entry); GET /medical-files/:id answers from `entries`.
function answers({
  post = () => json(entry(9), 201),
  entries = chainedFile(),
}: {
  post?: (request: SentRequest) => Response | Promise<Response>
  // The file — or a function giving it, read at each request (a test whose
  // POST adds an entry).
  entries?: MedicalFileEntry[] | (() => MedicalFileEntry[])
} = {}) {
  const current = () => (typeof entries === 'function' ? entries() : entries)
  return (request: SentRequest) => {
    const { method, path } = request
    if (method === 'GET' && path === '/users/6') return json(PAT_USER)
    if (method === 'GET' && path === '/medical-files?patientId=6') return json(current())
    const one = /^\/medical-files\/(\d+)$/.exec(path)
    if (method === 'GET' && one) {
      const found = current().find((e) => e.id === Number(one[1]))
      return found
        ? json(found)
        : json({ statusCode: 404, message: [`Medical file entry ${one[1]} not found`], error: 'Not Found' }, 404)
    }
    if (method === 'POST' && path === '/medical-files') return post(request)
    return undefined
  }
}

function posts() {
  return requests().filter((r) => r.method === 'POST')
}

describe('MedicalFileEntryPage — a new entry', () => {
  it('says what is missing at its field, moves focus to the first, and sends nothing', async () => {
    const user = userEvent.setup()
    renderMedicalFile([NEW_PATH], answers())

    expect(await screen.findByRole('heading', { level: 1, name: 'New entry' })).toBeInTheDocument()
    expect(await screen.findByText('Pat Lee')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save the entry' }))

    const type = screen.getByLabelText('Type of entry')
    expect(type).toHaveFocus()
    expect(type).toHaveAttribute('aria-invalid', 'true')
    expect(type).toHaveAccessibleDescription(NO_TYPE)
    expect(screen.getByRole('group', { name: 'Note' })).toHaveAccessibleDescription(NO_SECTION)
    expect(posts()).toEqual([])
  })

  it('shows no message before Save is pressed', async () => {
    renderMedicalFile([NEW_PATH], answers())
    await screen.findByRole('heading', { level: 1, name: 'New entry' })
    expect(screen.queryByText(NO_TYPE)).not.toBeInTheDocument()
    expect(screen.queryByText(NO_SECTION)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Type of entry')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('group', { name: 'Note' })).toHaveAccessibleDescription(
      'Fill in the sections that apply — at least one.',
    )
  })

  it('takes focus to the first section when only the sections are missing', async () => {
    const user = userEvent.setup()
    renderMedicalFile([NEW_PATH], answers())
    await user.selectOptions(await screen.findByLabelText('Type of entry'), 'Progress note')
    // The placeholder option is gone once a type is chosen.
    expect(screen.queryByRole('option', { name: 'Choose…' })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Plan'), '   ')
    await user.click(screen.getByRole('button', { name: 'Save the entry' }))

    expect(screen.getByLabelText('Subjective')).toHaveFocus()
    expect(screen.queryByText(NO_TYPE)).not.toBeInTheDocument()
    expect(screen.getByText(NO_SECTION)).toBeInTheDocument()
    expect(posts()).toEqual([])
  })

  it('offers the three types, with a hint under each section and their limits', async () => {
    renderMedicalFile([NEW_PATH], answers())
    const type = await screen.findByLabelText('Type of entry')
    expect(within(type).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Choose…',
      'Initial assessment',
      'Progress note',
      'Discharge summary',
    ])
    expect(screen.getByLabelText('Objective')).toHaveAccessibleDescription('What you measured or observed.')
    expect(screen.getByLabelText('Subjective')).toHaveAttribute('maxLength', '10000')
    // No reason on a new entry.
    expect(screen.queryByLabelText('Why are you amending it?')).not.toBeInTheDocument()
  })

  it('sends the entry, then returns to the file — replacing the form in the history — with a notice', async () => {
    const user = userEvent.setup()
    renderMedicalFile([PATIENT_PATH, NEW_PATH], answers())
    await user.selectOptions(await screen.findByLabelText('Type of entry'), 'Initial assessment')
    await user.type(screen.getByLabelText('Subjective'), '  Knee pain{Enter}on stairs ')
    await user.type(screen.getByLabelText('Plan'), 'Knee Rehab')
    await user.click(screen.getByRole('button', { name: 'Save the entry' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Medical file' })).toBeInTheDocument()
    expect(screen.getByText('Entry added.', { selector: '[role="status"]' })).toBeInTheDocument()
    expect(posts()).toEqual([
      {
        method: 'POST',
        path: '/medical-files',
        body: '{"patientId":6,"entryType":"initial_assessment","subjective":"Knee pain\\non stairs","plan":"Knee Rehab"}',
      },
    ])
    // The file is read AFTER the write — the answer includes the new entry.
    // Waited for through what the read SHOWS: the heading renders at once,
    // but React Query starts the read after the render is committed — under
    // a busy full run, a count taken right after the heading could still be
    // 0. The newest entry's text proves the read happened and answered.
    expect(await screen.findByText(/Sharp pain/)).toBeInTheDocument()
    const reads = requests().filter((r) => r.path === '/medical-files?patientId=6')
    expect(reads).toHaveLength(1)
    expect(requests().indexOf(reads[0])).toBeGreaterThan(requests().indexOf(posts()[0]))

    // Back leaves the file for the page BEFORE the form.
    await user.click(screen.getByRole('button', { name: 'test: back' }))
    expect(await screen.findByText('test: the patient page')).toBeInTheDocument()
  })

  // From the file (cached) to the form and back: the file must be read
  // again, or the list kept in the cache (fresh for 30 s) would show without
  // the entry just written.
  it('refreshes a file already open when the entry is saved', async () => {
    const user = userEvent.setup()
    let file = chainedFile()
    renderMedicalFile(
      [FILE_PATH],
      answers({
        post: () => {
          file = [entry(9, { plan: 'The new plan', createdAt: '2031-03-25T09:00:00.000Z' }), ...file]
          return json(file[0], 201)
        },
        entries: () => file,
      }),
    )
    await screen.findByRole('list', { name: 'Entries' })
    await user.click(screen.getByRole('link', { name: 'Add an entry' }))
    await user.selectOptions(await screen.findByLabelText('Type of entry'), 'Progress note')
    await user.type(screen.getByLabelText('Plan'), 'The new plan')
    await user.click(screen.getByRole('button', { name: 'Save the entry' }))

    expect(await screen.findByText('Entry added.', { selector: '[role="status"]' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Entries' })
    expect(await within(list).findByText('The new plan')).toBeInTheDocument()
    expect(requests().filter((r) => r.path === '/medical-files?patientId=6')).toHaveLength(2)
  })

  it("shows the backend's refusal and stays on the form, ready to try again", async () => {
    const user = userEvent.setup()
    renderMedicalFile(
      [NEW_PATH],
      answers({
        post: () =>
          json(
            {
              statusCode: 403,
              message: ['You can only add entries to the medical file of a patient on your care team'],
              error: 'Forbidden',
            },
            403,
          ),
      }),
    )
    await user.selectOptions(await screen.findByLabelText('Type of entry'), 'Progress note')
    await user.type(screen.getByLabelText('Plan'), 'P')
    await user.click(screen.getByRole('button', { name: 'Save the entry' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't save the entry. You can only add entries to the medical file of a patient on your care team",
    )
    expect(screen.getByRole('button', { name: 'Save the entry' })).toBeEnabled()
    expect(screen.getByLabelText('Plan')).toHaveValue('P')
  })

  it('disables the form while the entry is being saved', async () => {
    const user = userEvent.setup()
    let release: (response: Response) => void = () => undefined
    renderMedicalFile(
      [NEW_PATH],
      answers({ post: () => new Promise<Response>((resolve) => (release = resolve)) }),
    )
    await user.selectOptions(await screen.findByLabelText('Type of entry'), 'Progress note')
    await user.type(screen.getByLabelText('Plan'), 'P')
    await user.click(screen.getByRole('button', { name: 'Save the entry' }))

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByLabelText('Plan')).toBeDisabled()
    expect(screen.getByLabelText('Type of entry')).toBeDisabled()
    release(json(entry(9), 201))
    expect(await screen.findByRole('heading', { level: 1, name: 'Medical file' })).toBeInTheDocument()
  })

  it('leads back to the file with Cancel', async () => {
    renderMedicalFile([NEW_PATH], answers())
    expect(await screen.findByRole('link', { name: 'Cancel' })).toHaveAttribute('href', FILE_PATH)
  })
})

describe('MedicalFileEntryPage — an amendment', () => {
  it('starts from the version it corrects, says so, and needs a change and a reason', async () => {
    const user = userEvent.setup()
    renderMedicalFile([`${NEW_PATH}?amends=4`], answers())

    expect(await screen.findByRole('heading', { level: 1, name: 'Amend an entry' })).toBeInTheDocument()
    expect(
      screen.getByText(`Progress note · ${formatMomentDate('2031-03-12T11:00:00.000Z')}`, { selector: 'strong' })
        .parentElement,
    ).toHaveTextContent(/written by Alex Chen\. Your version replaces it in the file; the original stays/)
    expect(screen.getByLabelText('Type of entry')).toHaveValue('progress_note')
    expect(screen.getByLabelText('Objective')).toHaveValue('Right knee flexion 125°')
    expect(screen.getByLabelText('Plan')).toHaveValue('Plan of entry 4')
    expect(screen.getByLabelText('Why are you amending it?')).toHaveValue('')
    expect(screen.getByLabelText('Why are you amending it?')).toHaveAttribute('maxLength', '500')

    await user.click(screen.getByRole('button', { name: 'Save the amendment' }))
    // The first problem on the form is the unchanged note.
    expect(screen.getByLabelText('Subjective')).toHaveFocus()
    expect(screen.getByRole('group', { name: 'Note' })).toHaveAccessibleDescription(UNCHANGED)
    const reason = screen.getByLabelText('Why are you amending it?')
    expect(reason).toHaveAccessibleDescription(NO_REASON)
    expect(reason).toHaveAttribute('aria-invalid', 'true')
    expect(posts()).toEqual([])

    // A change but no reason: focus goes to the reason.
    await user.clear(screen.getByLabelText('Objective'))
    await user.type(screen.getByLabelText('Objective'), 'Right knee flexion 130°')
    await user.click(screen.getByRole('button', { name: 'Save the amendment' }))
    expect(reason).toHaveFocus()
    expect(screen.queryByText(UNCHANGED)).not.toBeInTheDocument()
    expect(posts()).toEqual([])
  })

  it('sends the amendment with the version it corrects and the reason, then returns to the file', async () => {
    const user = userEvent.setup()
    renderMedicalFile([`${NEW_PATH}?amends=4`], answers())
    await user.clear(await screen.findByLabelText('Objective'))
    await user.type(screen.getByLabelText('Objective'), 'Right knee flexion 130°')
    await user.type(screen.getByLabelText('Why are you amending it?'), ' Measured again ')
    await user.click(screen.getByRole('button', { name: 'Save the amendment' }))

    expect(await screen.findByText('Amendment saved.', { selector: '[role="status"]' })).toBeInTheDocument()
    expect(posts()).toEqual([
      {
        method: 'POST',
        path: '/medical-files',
        body: '{"patientId":6,"entryType":"progress_note","objective":"Right knee flexion 130°","plan":"Plan of entry 4","amendsId":4,"amendmentReason":"Measured again"}',
      },
    ])
  })

  it('reads the version once, as one entry (GET /medical-files/:id)', async () => {
    renderMedicalFile([`${NEW_PATH}?amends=4`], answers())
    await screen.findByRole('heading', { level: 1, name: 'Amend an entry' })
    expect(requests().map((r) => `${r.method} ${r.path}`).sort()).toEqual(['GET /medical-files/4', 'GET /users/6'])
  })

  it('sends an entry amended since to its newer version', async () => {
    renderMedicalFile([`${NEW_PATH}?amends=3`], answers())
    expect(await screen.findByRole('heading', { name: 'This entry has been amended since' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Amend the newer version' })).toHaveAttribute('href', `${NEW_PATH}?amends=4`)
    expect(screen.queryByRole('button', { name: 'Save the amendment' })).not.toBeInTheDocument()
  })

  it("says an entry that isn't in this patient's file is not available — missing, hidden, or another patient's", async () => {
    renderMedicalFile([`${NEW_PATH}?amends=77`], answers())
    await expectEntryNotAvailable()
  })

  it("says the same of another patient's entry under this patient's address", async () => {
    renderMedicalFile([`${NEW_PATH}?amends=8`], answers({ entries: [entry(8, { patientId: 9 })] }))
    await expectEntryNotAvailable()
    expect(screen.queryByRole('button', { name: 'Save the amendment' })).not.toBeInTheDocument()
  })

  it('says when the entry could not be loaded — and "Try again" asks again', async () => {
    const user = userEvent.setup()
    let fail = true
    renderMedicalFile([`${NEW_PATH}?amends=4`], (request) =>
      request.path === '/medical-files/4' && fail
        ? json({ statusCode: 500, message: ['Boom'], error: 'Error' }, 500)
        : answers()(request),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(/^Couldn't load the entry\. Something went wrong on our side\. Try again in a moment\.$/)
    expect(screen.getByRole('link', { name: 'Back to the medical file' })).toHaveAttribute('href', FILE_PATH)
    fail = false
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Save the amendment' })).toBeInTheDocument()
    // Focus on the form's heading, not lost at the top.
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1, name: 'Amend an entry' })).toHaveFocus(),
    )
  })

  it('shows a loading line while the version is read', () => {
    renderMedicalFile([`${NEW_PATH}?amends=4`], answers())
    expectLoading('Loading the entry…')
  })
})

describe('MedicalFileEntryPage — the address', () => {
  it.each(['/practitioner/patients/abc/medical-file/new', '/practitioner/patients/0/medical-file/new'])(
    'refuses %s',
    (path) => {
      renderMedicalFile([path], () => undefined)
      expect(screen.getByText("This address isn't valid.")).toBeInTheDocument()
      expect(requests()).toEqual([])
    },
  )

  // An entry id that isn't one: the same words as an entry that doesn't
  // exist — asking nothing.
  it.each([`${NEW_PATH}?amends=abc`, `${NEW_PATH}?amends=0`, `${NEW_PATH}?amends=2.5`])(
    'says %s is not available',
    async (path) => {
      renderMedicalFile([path], () => undefined)
      await expectEntryNotAvailable()
      expect(requests()).toEqual([])
    },
  )
})