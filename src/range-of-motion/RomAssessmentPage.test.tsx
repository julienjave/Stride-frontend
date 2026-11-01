import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMomentDate } from '@/common/formatMomentDate'
import { entry, json } from '@/medical-files/testData'
import type { MedicalFileEntry } from '@/medical-files/types'
import { expectSnackbar } from '@/snackbars/snackbarAssertions'
import { renderRangeOfMotion, requests, standardAnswers, type SentRequest } from './renderRangeOfMotion'
import { assessment, value } from './testData'
import type { RomAssessment } from './types'

const PAGE = '/practitioner/patients/6/range-of-motion'
const NEW = `${PAGE}/new`

// The clock: "today" is 10 March 2031, midday in every zone tested (only
// Date is faked — the user-event timers stay real).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2031-03-10T12:00:00.000Z') })
})
afterEach(() => {
  vi.useRealTimers()
})

// The patient's notes: one written today (10 March), two before — the
// progress note of 3 March amended once (5 → 6).
function notes(): MedicalFileEntry[] {
  return [
    entry(7, { createdAt: '2031-03-10T09:00:00.000Z' }),
    entry(6, { createdAt: '2031-03-04T09:00:00.000Z', amendsId: 5, amendmentReason: 'Typo' }),
    entry(5, { createdAt: '2031-03-03T09:00:00.000Z', amendedById: 6 }),
    entry(1, { entryType: 'initial_assessment', createdAt: '2031-03-01T09:00:00.000Z' }),
  ]
}

// The version an amendment starts from.
const ORIGINAL = assessment(9, {
  measuredOn: '2031-03-04',
  medicalFileEntryId: 6,
  measurements: [
    value('cervical_flexion', null, 40),
    value('knee_flexion', 'left', 130, { note: 'stiff' }),
    value('knee_flexion', 'right', 102),
  ],
})

function answers({
  post = () => json(assessment(20), 201),
  stored = [ORIGINAL],
  noteStatus = 200,
}: {
  post?: (request: SentRequest) => Response
  stored?: RomAssessment[]
  noteStatus?: number
} = {}) {
  return standardAnswers((request) => {
    const { method, path } = request
    if (method === 'POST' && path === '/range-of-motion') return post(request)
    if (method === 'GET' && path === '/medical-files?patientId=6') {
      return noteStatus === 200 ? json(notes()) : json({ statusCode: noteStatus, message: ['x'], error: 'x' }, noteStatus)
    }
    // The page the form returns to.
    if (method === 'GET' && path === '/range-of-motion?patientId=6') return json(stored)
    const one = /^\/range-of-motion\/(\d+)$/.exec(path)
    if (method === 'GET' && one) {
      const found = stored.find((a) => a.id === Number(one[1]))
      return found
        ? json(found)
        : json({ statusCode: 404, message: [`Range-of-motion assessment ${one[1]} not found`], error: 'Not Found' }, 404)
    }
    return undefined
  })
}

function posts() {
  return requests().filter((r) => r.method === 'POST')
}

async function openForm(path = NEW, options?: Parameters<typeof answers>[0]) {
  const user = userEvent.setup()
  renderRangeOfMotion([PAGE, path], answers(options))
  await screen.findByRole('group', { name: 'Movement 1' })
  return user
}

function row(n: number) {
  return within(screen.getByRole('group', { name: `Movement ${n}` }))
}

describe('RomAssessmentPage — a new assessment', () => {
  it('starts today, with no note, one empty row of Left / Right boxes', async () => {
    await openForm()
    expect(screen.getByRole('heading', { level: 1, name: 'Record range of motion' })).toBeInTheDocument()
    expect(await screen.findByText('Pat Lee')).toBeInTheDocument()
    const day = screen.getByLabelText('Measured on')
    expect(day).toHaveValue('2031-03-10')
    // The picker greys out the future.
    expect(day).toHaveAttribute('max', '2031-03-10')
    await waitFor(() => expect(screen.getByLabelText('Visit note (optional)')).toBeEnabled())
    expect(screen.getByLabelText('Visit note (optional)')).toHaveDisplayValue('No note')
    expect(row(1).getByLabelText('Movement')).toHaveDisplayValue('Choose…')
    expect(row(1).getByLabelText('Mode')).toHaveDisplayValue('Active')
    expect(row(1).getByLabelText('Left')).toHaveValue('')
    expect(row(1).getByLabelText('Right')).toHaveValue('')
    // The only row can't be removed.
    expect(row(1).queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', PAGE)
  })

  it("groups the movements by joint, each named in full; offers the notes' latest versions, that day's first", async () => {
    await openForm()
    const movement = row(1).getByLabelText('Movement')
    expect(
      [...movement.querySelectorAll('optgroup')].map((group) => [
        group.label,
        [...group.querySelectorAll('option')].map((o) => o.textContent),
      ]),
    ).toStrictEqual([
      ['Neck', ['Neck flexion', 'Neck rotation']],
      ['Knee', ['Knee flexion', 'Knee extension']],
    ])
    const note = screen.getByLabelText('Visit note (optional)')
    await waitFor(() => expect(note).toBeEnabled())
    expect(
      [...note.querySelectorAll('optgroup')].map((group) => [
        group.label,
        [...group.querySelectorAll('option')].map((o) => o.value),
      ]),
    ).toStrictEqual([
      ['Written that day', ['7']],
      // 5 was replaced by 6: only the note as it now reads.
      ['Other notes', ['6', '1']],
    ])
    expect(within(note).getByRole('option', { name: `Progress note · ${formatMomentDate('2031-03-10T09:00:00.000Z')}` })).toBeInTheDocument()
  })

  it('records the filled boxes — sides, a negative value, a note, the visit note — and returns to the record', async () => {
    const user = await openForm()
    await user.selectOptions(row(1).getByLabelText('Movement'), 'knee_flexion')
    expect(row(1).getByText('Typical 135°')).toBeInTheDocument()
    await user.type(row(1).getByLabelText('Left'), '138')
    await user.type(row(1).getByLabelText('Right'), '120')
    await user.click(row(1).getByRole('button', { name: 'Add a note to right' }))
    await user.type(row(1).getByLabelText('Note (right)'), 'pain at end range')
    await user.click(screen.getByRole('button', { name: '+ Add a movement' }))
    expect(row(2).getByLabelText('Movement')).toHaveFocus()
    await user.selectOptions(row(2).getByLabelText('Movement'), 'cervical_flexion')
    await user.selectOptions(row(2).getByLabelText('Mode'), 'passive')
    // A movement with no side: ONE box.
    expect(row(2).queryByLabelText('Left')).not.toBeInTheDocument()
    await user.type(row(2).getByLabelText('Degrees'), '-5')
    await waitFor(() => expect(screen.getByLabelText('Visit note (optional)')).toBeEnabled())
    await user.selectOptions(screen.getByLabelText('Visit note (optional)'), '7')

    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Range of motion' })).toBeInTheDocument()
    expect(posts().map((r) => r.body)).toStrictEqual([
      '{"patientId":6,"measuredOn":"2031-03-10","measurements":[' +
        '{"movement":"knee_flexion","mode":"active","degrees":138,"side":"left"},' +
        '{"movement":"knee_flexion","mode":"active","degrees":120,"side":"right","note":"pain at end range"},' +
        '{"movement":"cervical_flexion","mode":"passive","degrees":-5}],"medicalFileEntryId":7}',
    ])
    expectSnackbar('success', 'Assessment recorded.')
    // The form REPLACED itself: Back leads past it.
    await userEvent.setup().click(screen.getByRole('button', { name: 'test: back' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Range of motion' })).toBeInTheDocument()
  })

  it('opens with the note given by the address chosen ("Record measurements for this visit")', async () => {
    await openForm(`${NEW}?note=1`)
    const note = screen.getByLabelText('Visit note (optional)')
    await waitFor(() => expect(note).toBeEnabled())
    expect(note).toHaveValue('1')
  })

  it('ignores a note address that is no id', async () => {
    await openForm(`${NEW}?note=abc`)
    await waitFor(() => expect(screen.getByLabelText('Visit note (optional)')).toBeEnabled())
    expect(screen.getByLabelText('Visit note (optional)')).toHaveValue('')
  })

  it('says what is wrong at each box, focuses the first, and sends nothing', async () => {
    const user = await openForm()
    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    // Nothing at all: the list's message, focus on the first picker.
    expect(screen.getByRole('group', { name: 'Measurements' })).toHaveAccessibleDescription(
      'Enter at least one measurement.',
    )
    expect(row(1).getByLabelText('Movement')).toHaveFocus()

    await user.type(row(1).getByLabelText('Left'), '12.5')
    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    expect(row(1).getByLabelText('Movement')).toHaveAccessibleDescription('Choose the movement.')
    expect(row(1).getByLabelText('Movement')).toHaveFocus()

    await user.selectOptions(row(1).getByLabelText('Movement'), 'knee_flexion')
    await user.type(row(1).getByLabelText('Right'), '201')
    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    const left = row(1).getByLabelText('Left')
    expect(left).toHaveFocus()
    expect(left).toHaveAttribute('aria-invalid', 'true')
    expect(left).toHaveAccessibleDescription('Enter whole degrees, like 95 or -5.')
    expect(row(1).getByLabelText('Right')).toHaveAccessibleDescription('Enter a value between −90° and 200°.')
    // The list's message is gone once the rows speak for themselves.
    expect(screen.getByRole('group', { name: 'Measurements' })).not.toHaveAccessibleDescription(
      'Enter at least one measurement.',
    )
    expect(posts()).toStrictEqual([])
  })

  it('refuses a day in the future at the date field', async () => {
    const user = await openForm()
    const day = screen.getByLabelText('Measured on')
    await user.clear(day)
    await user.type(day, '2031-03-11')
    await user.selectOptions(row(1).getByLabelText('Movement'), 'knee_flexion')
    await user.type(row(1).getByLabelText('Left'), '100')
    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    expect(day).toHaveFocus()
    expect(day).toHaveAccessibleDescription("The measurement day can't be in the future.")
    expect(posts()).toStrictEqual([])
  })

  it("puts the backend's refusal of one value at its box, and the rest above Save", async () => {
    const user = await openForm(NEW, {
      post: () =>
        json(
          {
            statusCode: 400,
            message: ['measurements.1.Knee flexion must be between -90° and 200°', 'Something else'],
            error: 'Bad Request',
          },
          400,
        ),
    })
    await user.selectOptions(row(1).getByLabelText('Movement'), 'knee_flexion')
    await user.type(row(1).getByLabelText('Left'), '100')
    await user.type(row(1).getByLabelText('Right'), '110')
    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    const right = row(1).getByLabelText('Right')
    await waitFor(() => expect(right).toHaveFocus())
    expect(right).toHaveAccessibleDescription('Knee flexion must be between -90° and 200°.')
    expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't save the assessment\. Something else$/)
  })

  it("shows only the box's message when the backend said nothing else", async () => {
    const user = await openForm(NEW, {
      post: () =>
        json({ statusCode: 400, message: ['measurements.0.Knee flexion needs a side'], error: 'Bad Request' }, 400),
    })
    await user.selectOptions(row(1).getByLabelText('Movement'), 'knee_flexion')
    await user.type(row(1).getByLabelText('Left'), '100')
    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    await waitFor(() => expect(row(1).getByLabelText('Left')).toHaveAccessibleDescription('Knee flexion needs a side.'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it("says any other refusal in the backend's own words", async () => {
    const user = await openForm(NEW, {
      post: () =>
        json(
          { statusCode: 403, message: ['You can only record range of motion for a patient on your care team'], error: 'Forbidden' },
          403,
        ),
    })
    await user.selectOptions(row(1).getByLabelText('Movement'), 'knee_flexion')
    await user.type(row(1).getByLabelText('Left'), '100')
    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /^Couldn't save the assessment\. You can only record range of motion for a patient on your care team/,
    )
  })

  it('removes a row, focus going to the one that took its place', async () => {
    const user = await openForm()
    await user.click(screen.getByRole('button', { name: '+ Add a movement' }))
    await user.click(screen.getByRole('button', { name: '+ Add a movement' }))
    await user.selectOptions(row(3).getByLabelText('Movement'), 'knee_extension')
    await user.click(row(2).getByRole('button', { name: 'Remove movement 2' }))
    // The third row is now the second, and has the focus.
    expect(screen.queryByRole('group', { name: 'Movement 3' })).not.toBeInTheDocument()
    expect(row(2).getByLabelText('Movement')).toHaveDisplayValue('Knee extension')
    expect(row(2).getByLabelText('Movement')).toHaveFocus()
    // The last row removed: focus to the one before.
    await user.click(row(2).getByRole('button', { name: 'Remove movement 2' }))
    expect(row(1).getByLabelText('Movement')).toHaveFocus()
    expect(row(1).queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument()
  })

  it("still records when the notes can't be loaded — and says so", async () => {
    const user = await openForm(NEW, { noteStatus: 500 })
    expect(await screen.findByText("The notes couldn't be loaded. You can save without linking one.")).toBeInTheDocument()
    await user.selectOptions(row(1).getByLabelText('Movement'), 'knee_flexion')
    await user.type(row(1).getByLabelText('Left'), '100')
    await user.click(screen.getByRole('button', { name: 'Save the assessment' }))
    await waitFor(() => expect(posts()).toHaveLength(1))
  })
})

describe('RomAssessmentPage — an amendment', () => {
  it('starts as a copy of the version, asks for a change and a reason, and sends the amendment', async () => {
    const user = await openForm(`${NEW}?amends=9`)
    expect(screen.getByRole('heading', { level: 1, name: 'Amend an assessment' })).toBeInTheDocument()
    expect(screen.getByLabelText('Measured on')).toHaveValue('2031-03-04')
    await waitFor(() => expect(screen.getByLabelText('Visit note (optional)')).toHaveValue('6'))
    expect(row(1).getByLabelText('Movement')).toHaveDisplayValue('Neck flexion')
    expect(row(1).getByLabelText('Degrees')).toHaveValue('40')
    expect(row(2).getByLabelText('Left')).toHaveValue('130')
    expect(row(2).getByLabelText('Note (left)')).toHaveValue('stiff')
    expect(row(2).getByLabelText('Right')).toHaveValue('102')

    await user.click(screen.getByRole('button', { name: 'Save the amendment' }))
    expect(screen.getByRole('group', { name: 'Measurements' })).toHaveAccessibleDescription(
      'Nothing has changed yet: correct the measurements before saving the amendment.',
    )
    expect(screen.getByLabelText('Why are you amending it?')).toHaveAccessibleDescription(
      'Say why you are amending these measurements.',
    )
    expect(posts()).toStrictEqual([])

    await user.clear(row(2).getByLabelText('Right'))
    await user.type(row(2).getByLabelText('Right'), '120')
    await user.type(screen.getByLabelText('Why are you amending it?'), 'Typed as 102°')
    await user.click(screen.getByRole('button', { name: 'Save the amendment' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Range of motion' })).toBeInTheDocument()
    expect(posts().map((r) => r.body)).toStrictEqual([
      '{"patientId":6,"measuredOn":"2031-03-04","measurements":[' +
        '{"movement":"cervical_flexion","mode":"active","degrees":40},' +
        '{"movement":"knee_flexion","mode":"active","degrees":130,"side":"left","note":"stiff"},' +
        '{"movement":"knee_flexion","mode":"active","degrees":120,"side":"right"}],' +
        '"medicalFileEntryId":6,"amendsId":9,"amendmentReason":"Typed as 102°"}',
    ])
    expectSnackbar('success', 'Amendment saved.')
  })

  it('keeps a linked note that has been amended since as a choice, said so', async () => {
    await openForm(`${NEW}?amends=9`, { stored: [{ ...ORIGINAL, medicalFileEntryId: 5 }] })
    const note = screen.getByLabelText('Visit note (optional)')
    await waitFor(() => expect(note).toHaveValue('5'))
    expect(note).toHaveDisplayValue(`Progress note · ${formatMomentDate('2031-03-03T09:00:00.000Z')} (since amended)`)
  })

  it('leads to the newer version of an assessment amended since', async () => {
    renderRangeOfMotion([PAGE, `${NEW}?amends=9`], answers({ stored: [{ ...ORIGINAL, amendedById: 12 }] }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'This assessment has been amended since' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Amend the newer version' })).toHaveAttribute('href', `${NEW}?amends=12`)
  })

  it('asks for nothing with an amends address that is no id (0 is none)', async () => {
    renderRangeOfMotion([PAGE, `${NEW}?amends=0`], answers())
    expect(await screen.findByRole('heading', { level: 1, name: 'Assessment not available' })).toBeInTheDocument()
    expect(requests().filter((r) => /^\/range-of-motion\/\d/.test(r.path))).toStrictEqual([])
  })

  it.each([
    ['missing (404)', `${NEW}?amends=99`, [ORIGINAL]],
    ["another patient's", `${NEW}?amends=9`, [{ ...ORIGINAL, patientId: 8 }]],
    ['no id at all', `${NEW}?amends=abc`, [ORIGINAL]],
  ])('says an assessment that is %s is not available', async (_, path, stored) => {
    renderRangeOfMotion([PAGE, path], answers({ stored }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Assessment not available' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(
      /^This assessment doesn't exist, or it isn't in this patient's record\.$/,
    )
    expect(screen.getByRole('link', { name: 'Back to the range of motion' })).toHaveAttribute('href', PAGE)
    expect(screen.queryByRole('button', { name: 'Save the amendment' })).not.toBeInTheDocument()
  })
})