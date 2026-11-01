import { describe, expect, it } from 'vitest'
import {
  MEASURED_ON_ID,
  MEASUREMENTS_ID,
  REASON_ID,
  assessmentBody,
  boxesOf,
  draftFrom,
  draftProblems,
  emptyDraft,
  emptyRow,
  nextRowKey,
  parseDegrees,
  serverProblems,
  type AssessmentDraft,
  type RowDraft,
} from './romDraft'
import { indexCatalogue } from './romRules'
import { assessment, catalogue, value } from './testData'

const index = indexCatalogue(catalogue())
const TODAY = '2031-03-10'

// A row with a movement and its boxes filled as given.
function row(key: number, movement: string, boxes: Partial<Record<'left' | 'right' | 'none', string>>, fields: Partial<RowDraft> = {}): RowDraft {
  const base = emptyRow(key)
  for (const [box, degrees] of Object.entries(boxes)) {
    base.boxes[box as 'left' | 'right' | 'none'] = { degrees, note: '', noteOpen: false }
  }
  return { ...base, movement, ...fields }
}

function draft(rows: RowDraft[], fields: Partial<AssessmentDraft> = {}): AssessmentDraft {
  return { ...emptyDraft(TODAY), rows, ...fields }
}

describe('the empty draft', () => {
  it('starts today, with the given note, and one empty row', () => {
    expect(emptyDraft(TODAY, '7')).toStrictEqual({ measuredOn: TODAY, noteId: '7', reason: '', rows: [emptyRow(1)] })
    expect(emptyDraft(TODAY).noteId).toBe('')
  })

  it('gives a new row the next free key', () => {
    expect(nextRowKey(draft([row(3, '', {}), row(1, '', {})]))).toBe(4)
    expect(nextRowKey(draft([]))).toBe(1)
  })
})

describe('boxesOf', () => {
  it('is Left and Right for a sided movement (and before one is chosen), one box otherwise', () => {
    expect(boxesOf(index.get('knee_flexion'))).toStrictEqual(['left', 'right'])
    expect(boxesOf(undefined)).toStrictEqual(['left', 'right'])
    expect(boxesOf(index.get('cervical_flexion'))).toStrictEqual(['none'])
  })
})

describe('parseDegrees', () => {
  it('reads whole signed degrees, with a hyphen or a real minus, spaces around', () => {
    expect(parseDegrees('95')).toBe(95)
    expect(parseDegrees(' -5 ')).toBe(-5)
    expect(parseDegrees('−5')).toBe(-5)
    expect(parseDegrees('0')).toBe(0)
  })

  it('refuses anything else', () => {
    for (const text of ['', '95.5', '95°', 'ninety', '+5', '- 5', '12345', '1e2']) {
      expect(parseDegrees(text), text).toBeNull()
    }
  })
})

describe('draftProblems', () => {
  it('finds nothing in a right draft', () => {
    expect(
      draftProblems(draft([row(1, 'knee_flexion', { right: '120' }), row(2, 'cervical_flexion', { none: '-5' })]), index, TODAY),
    ).toStrictEqual([])
  })

  it('wants a real day, not in the future (today is fine)', () => {
    const ok = [row(1, 'knee_flexion', { right: '120' })]
    expect(draftProblems(draft(ok, { measuredOn: '' }), index, TODAY)).toStrictEqual([
      { field: MEASURED_ON_ID, message: 'Enter the day the measurements were taken.' },
    ])
    expect(draftProblems(draft(ok, { measuredOn: '2031-03-11' }), index, TODAY)).toStrictEqual([
      { field: MEASURED_ON_ID, message: "The measurement day can't be in the future." },
    ])
    expect(draftProblems(draft(ok, { measuredOn: TODAY }), index, TODAY)).toStrictEqual([])
  })

  it('ignores an empty row, and asks for a measurement when there is none', () => {
    expect(draftProblems(draft([row(1, '', {})]), index, TODAY)).toStrictEqual([
      { field: MEASUREMENTS_ID, message: 'Enter at least one measurement.' },
    ])
    expect(draftProblems(draft([row(1, 'knee_flexion', { right: '1' }), row(2, '', {})]), index, TODAY)).toStrictEqual([])
  })

  it('wants a movement for a row with something in it', () => {
    expect(draftProblems(draft([row(5, '', { left: '30' })]), index, TODAY)).toStrictEqual([
      { field: 'rom-row-5-movement', message: 'Choose the movement.' },
    ])
    // A note alone counts as something.
    const noted = row(5, '', {})
    noted.boxes.right = { degrees: '', note: 'x', noteOpen: true }
    expect(draftProblems(draft([noted]), index, TODAY)).toStrictEqual([
      { field: 'rom-row-5-movement', message: 'Choose the movement.' },
    ])
  })

  it('wants a value for a row whose movement is chosen', () => {
    expect(draftProblems(draft([row(2, 'cervical_flexion', {})]), index, TODAY)).toStrictEqual([
      { field: 'rom-row-2-none', message: 'Enter a value, or remove the row.' },
    ])
    // Only the boxes the movement uses: a value typed in a knee's Left box
    // before switching to the neck doesn't count.
    expect(draftProblems(draft([row(2, 'cervical_flexion', { left: '30' })]), index, TODAY)).toStrictEqual([
      { field: 'rom-row-2-none', message: 'Enter a value, or remove the row.' },
    ])
  })

  it('refuses the same movement and mode in two rows — another mode is fine', () => {
    const rows = [
      row(1, 'knee_flexion', { right: '120' }),
      row(2, 'knee_flexion', { right: '125' }, { mode: 'passive' }),
      row(3, 'knee_flexion', { left: '130' }),
    ]
    expect(draftProblems(draft(rows), index, TODAY)).toStrictEqual([
      { field: 'rom-row-3-movement', message: 'This movement is already in another row with the same mode.' },
    ])
  })

  it('checks each used box: a value for a note, whole degrees, the bounds included', () => {
    const noteOnly = row(1, 'knee_flexion', { right: '120' })
    noteOnly.boxes.left = { degrees: ' ', note: 'stiff', noteOpen: true }
    expect(draftProblems(draft([noteOnly]), index, TODAY)).toStrictEqual([
      { field: 'rom-row-1-left', message: 'Enter the value this note is about.' },
    ])
    expect(draftProblems(draft([row(1, 'knee_flexion', { left: '12.5', right: '201' })]), index, TODAY)).toStrictEqual([
      { field: 'rom-row-1-left', message: 'Enter whole degrees, like 95 or -5.' },
      { field: 'rom-row-1-right', message: 'Enter a value between −90° and 200°.' },
    ])
    expect(draftProblems(draft([row(1, 'knee_flexion', { left: '-91' })]), index, TODAY)).toStrictEqual([
      { field: 'rom-row-1-left', message: 'Enter a value between −90° and 200°.' },
    ])
    // The bounds themselves are allowed.
    expect(draftProblems(draft([row(1, 'knee_flexion', { left: '-90', right: '200' })]), index, TODAY)).toStrictEqual([])
  })

  it('says the whole-list problems only once every row is right', () => {
    // A row's problem, and nothing to send: only the row's.
    expect(draftProblems(draft([row(1, 'knee_flexion', { left: 'x' })]), index, TODAY)).toStrictEqual([
      { field: 'rom-row-1-left', message: 'Enter whole degrees, like 95 or -5.' },
    ])
  })

  it('refuses more values than an assessment holds (60)', () => {
    // A catalogue of 31 sided movements, so 31 rows of two values each are
    // all different (a repeated movement would be refused first).
    const rows: RowDraft[] = Array.from({ length: 31 }, (_, i) => row(i + 1, `m${i + 1}`, { left: '1', right: '2' }))
    const big = indexCatalogue({
      joints: [
        {
          joint: 'x',
          label: 'X',
          movements: rows.map((r) => ({
            movement: r.movement,
            label: 'M',
            name: 'M',
            sided: true,
            typicalDegrees: 10,
            lowestDegrees: -90,
            highestDegrees: 50,
          })),
        },
      ],
    })
    expect(draftProblems(draft(rows), big, TODAY)).toStrictEqual([
      { field: MEASUREMENTS_ID, message: 'An assessment can hold at most 60 values — record the rest in another one.' },
    ])
    expect(draftProblems(draft(rows.slice(0, 30)), big, TODAY)).toStrictEqual([])
  })

  describe('for an amendment', () => {
    const original = assessment(9, {
      patientId: 6,
      measuredOn: '2031-03-04',
      medicalFileEntryId: 2,
      measurements: [
        value('cervical_flexion', null, 40),
        value('knee_flexion', 'left', 130, { note: 'stiff' }),
        value('knee_flexion', 'right', 102),
      ],
    })

    it('wants a reason that says something — spaces are not one', () => {
      const changed = draftFrom(original)
      changed.rows[1].boxes.right.degrees = '120'
      changed.reason = '   '
      expect(draftProblems(changed, index, TODAY, original)).toStrictEqual([
        { field: REASON_ID, message: 'Say why you are amending these measurements.' },
      ])
    })

    it('wants a reason, and a change', () => {
      expect(draftProblems(draftFrom(original), index, TODAY, original)).toStrictEqual([
        {
          field: MEASUREMENTS_ID,
          message: 'Nothing has changed yet: correct the measurements before saving the amendment.',
        },
        { field: REASON_ID, message: 'Say why you are amending these measurements.' },
      ])
    })

    it.each<[string, (d: AssessmentDraft) => void]>([
      ['a value', (d) => (d.rows[1].boxes.right.degrees = '120')],
      ['a note', (d) => (d.rows[1].boxes.left.note = 'stiffer')],
      ['the day', (d) => (d.measuredOn = '2031-03-03')],
      ['the visit note', (d) => (d.noteId = '')],
      ['the mode', (d) => (d.rows[0].mode = 'passive')],
    ])('counts a change of %s', (_, change) => {
      const changed = draftFrom(original)
      change(changed)
      changed.reason = 'Why'
      expect(draftProblems(changed, index, TODAY, original)).toStrictEqual([])
    })

    it("doesn't count spaces round a value, or rows in another order, as a change", () => {
      const same = draftFrom(original)
      same.rows[1].boxes.right.degrees = ' 102 '
      same.rows.reverse()
      same.reason = 'Why'
      expect(draftProblems(same, index, TODAY, original).map((p) => p.field)).toStrictEqual([MEASUREMENTS_ID])
    })
  })
})

describe('draftFrom', () => {
  it('copies a version into rows — one per movement and mode, its notes shown — with no reason', () => {
    const copy = draftFrom(
      assessment(9, {
        measuredOn: '2031-03-04',
        medicalFileEntryId: 2,
        measurements: [
          value('cervical_flexion', null, -5),
          value('knee_flexion', 'left', 130),
          value('knee_flexion', 'right', 102, { note: 'pain' }),
          value('knee_flexion', 'right', 110, { mode: 'passive' }),
        ],
      }),
    )
    expect(copy.measuredOn).toBe('2031-03-04')
    expect(copy.noteId).toBe('2')
    expect(copy.reason).toBe('')
    expect(copy.rows.map((r) => [r.key, r.movement, r.mode])).toStrictEqual([
      [1, 'cervical_flexion', 'active'],
      [2, 'knee_flexion', 'active'],
      [3, 'knee_flexion', 'passive'],
    ])
    expect(copy.rows[0].boxes.none).toStrictEqual({ degrees: '-5', note: '', noteOpen: false })
    expect(copy.rows[1].boxes.left).toStrictEqual({ degrees: '130', note: '', noteOpen: false })
    expect(copy.rows[1].boxes.right).toStrictEqual({ degrees: '102', note: 'pain', noteOpen: true })
    expect(copy.rows[2].boxes.left).toStrictEqual({ degrees: '', note: '', noteOpen: false })
  })

  it('has no note when none was linked, and a row to type in even with no value', () => {
    const copy = draftFrom(assessment(9, { measurements: [] }))
    expect(copy.noteId).toBe('')
    expect(copy.rows).toStrictEqual([emptyRow(1)])
  })
})

describe('assessmentBody', () => {
  it('sends one value per filled box the movement uses, and says which box each came from', () => {
    const knee = row(4, 'knee_flexion', { left: ' 130 ', right: '−3', none: '9' })
    knee.boxes.left.note = '  stiff  '
    knee.boxes.right.note = '   '
    const neck = row(7, 'cervical_flexion', { left: '1', none: '40' }, { mode: 'passive' })
    const { body, sources } = assessmentBody(draft([knee, row(8, '', {}), neck], { noteId: '12' }), index, 6)
    expect(JSON.stringify(body)).toBe(
      '{"patientId":6,"measuredOn":"2031-03-10","measurements":[' +
        '{"movement":"knee_flexion","mode":"active","degrees":130,"side":"left","note":"stiff"},' +
        '{"movement":"knee_flexion","mode":"active","degrees":-3,"side":"right"},' +
        '{"movement":"cervical_flexion","mode":"passive","degrees":40}],"medicalFileEntryId":12}',
    )
    expect(sources).toStrictEqual(['rom-row-4-left', 'rom-row-4-right', 'rom-row-7-none'])
  })

  it('adds the amended version and the trimmed reason to an amendment — and no note when none is chosen', () => {
    const { body } = assessmentBody(
      draft([row(1, 'knee_flexion', { right: '120' })], { reason: '  Typo  ' }),
      index,
      6,
      9,
    )
    expect(JSON.stringify(body)).toBe(
      '{"patientId":6,"measuredOn":"2031-03-10","measurements":[{"movement":"knee_flexion","mode":"active","degrees":120,"side":"right"}],"amendsId":9,"amendmentReason":"Typo"}',
    )
  })
})

describe('serverProblems', () => {
  it("puts a value's refusal at its box, and keeps the rest general", () => {
    expect(
      serverProblems(
        [
          'measurements.1.Knee flexion must be between -90° and 200°',
          "The note to link isn't in this patient's medical file",
          'measurements.9.Out of the list',
        ],
        ['rom-row-1-left', 'rom-row-1-right'],
      ),
    ).toStrictEqual({
      problems: [{ field: 'rom-row-1-right', message: 'Knee flexion must be between -90° and 200°.' }],
      general: ["The note to link isn't in this patient's medical file", 'measurements.9.Out of the list'],
    })
  })
})