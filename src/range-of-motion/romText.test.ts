import { describe, expect, it } from 'vitest'
import { formatDayMonth } from '@/common/calendarDate'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatMomentDate } from '@/common/formatMomentDate'
import { entry } from '@/medical-files/testData'
import { indexCatalogue } from './romRules'
import {
  assessmentAmendsText,
  assessmentByline,
  assessmentHeading,
  cardTitle,
  changeText,
  degreesText,
  measurementLabel,
  replacedByText,
  typicalText,
  visitNoteText,
} from './romText'
import { assessment, catalogue, value } from './testData'

describe('degreesText', () => {
  it('writes the sign with a real minus, and nothing for zero or more', () => {
    expect(degreesText(126)).toBe('126°')
    expect(degreesText(0)).toBe('0°')
    expect(degreesText(-5)).toBe('−5°')
  })
})

describe('cardTitle', () => {
  it('names the movement and the mode', () => {
    expect(cardTitle('Knee flexion', 'passive')).toBe('Knee flexion · passive')
  })
})

describe('typicalText', () => {
  it('is short for the practitioner, and says "a guide" to the patient', () => {
    expect(typicalText(135, 'practitioner')).toBe('Typical 135°')
    expect(typicalText(0, 'patient')).toBe('Typical: 0° (a guide, not a target)')
  })
})

describe('changeText', () => {
  const day = formatDayMonth('2031-03-01')
  it('shows an arrow and says it in words — up, down, or no change', () => {
    expect(changeText(16, '2031-03-01')).toStrictEqual({
      shown: `↑ 16° since ${day}`,
      spoken: `16° more than on ${day}`,
    })
    expect(changeText(-5, '2031-03-01')).toStrictEqual({
      shown: `↓ 5° since ${day}`,
      spoken: `5° less than on ${day}`,
    })
    expect(changeText(0, '2031-03-01')).toStrictEqual({
      shown: `No change since ${day}`,
      spoken: `No change since ${day}`,
    })
  })
})

describe('an assessment', () => {
  it('is headed by the day measured', () => {
    expect(assessmentHeading(assessment(1, { measuredOn: '2031-03-04' }))).toBe(
      `Measured ${formatCalendarDate('2031-03-04')}`,
    )
  })

  it('names its author and counts its values', () => {
    expect(assessmentByline(assessment(1, { measurements: [value('knee_flexion', 'left', 1)] }))).toBe(
      'By Alex Chen · 1 value',
    )
    expect(
      assessmentByline(
        assessment(1, { measurements: [value('knee_flexion', 'left', 1), value('knee_flexion', 'right', 1)] }),
      ),
    ).toBe('By Alex Chen · 2 values')
  })

  it('says when it was typed in on another day than measured (midday: the same day in every zone tested)', () => {
    const late = assessment(1, { measuredOn: '2031-03-04', createdAt: '2031-03-05T12:00:00.000Z' })
    expect(assessmentByline(late)).toBe(
      `By Alex Chen · 1 value · recorded ${formatMomentDate('2031-03-05T12:00:00.000Z')}`,
    )
  })

  it('names the linked note as the medical file does, or says it is a note of the file', () => {
    const notes = [entry(2, { entryType: 'initial_assessment', createdAt: '2031-03-01T09:00:00.000Z' })]
    expect(visitNoteText(2, notes)).toBe(`Visit note: Initial assessment · ${formatMomentDate('2031-03-01T09:00:00.000Z')}`)
    expect(visitNoteText(3, notes)).toBe('Visit note: a note of the medical file')
    expect(visitNoteText(2, undefined)).toBe('Visit note: a note of the medical file')
  })

  it("says what an amendment corrects, in each audience's word", () => {
    const original = assessment(1, { measuredOn: '2031-03-04' })
    const amendment = assessment(2, { amendsId: 1, amendmentReason: 'Typo' })
    const day = formatCalendarDate('2031-03-04')
    expect(assessmentAmendsText(amendment, original, 'practitioner')).toBe(`Amends the measurements of ${day}: Typo`)
    expect(assessmentAmendsText(amendment, original, 'patient')).toBe(`Corrects the measurements of ${day}: Typo`)
  })

  it('dates a replaced version by the moment its correction was recorded', () => {
    expect(replacedByText(assessment(2, { createdAt: '2031-03-05T12:00:00.000Z' }))).toBe(
      `Amended on ${formatMomentDate('2031-03-05T12:00:00.000Z')}`,
    )
  })

  it('labels a value like the PDF copy — the side only when there is one', () => {
    const index = indexCatalogue(catalogue())
    expect(measurementLabel(value('knee_flexion', 'right', 1, { mode: 'passive' }), index)).toBe(
      'Knee flexion, right, passive',
    )
    expect(measurementLabel(value('cervical_flexion', null, 1), index)).toBe('Neck flexion, active')
    // A movement this page doesn't know: its code, rather than nothing.
    expect(measurementLabel(value('new_one', null, 1), index)).toBe('new_one, active')
  })
})