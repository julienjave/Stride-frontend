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
import { draftFrom, draftProblems, emptyDraft, entryBody, groupIntoNotes } from './medicalFileRules'
import { chainedFile, entry } from './testData'

const ids = (entries: { id: number }[]) => entries.map((e) => e.id)

describe('groupIntoNotes', () => {
  it("puts each note's latest version on top, its earlier versions newest first, in the file's order", () => {
    const notes = groupIntoNotes(chainedFile())
    expect(notes.map((note) => [note.latest.id, ids(note.earlier)])).toEqual([
      [5, []],
      [4, [3, 2]],
      [1, []],
    ])
  })

  it('stops at a version the file does not hold, without throwing', () => {
    // Entry 9 says it amends 8, which isn't in the list.
    const notes = groupIntoNotes([entry(9, { amendsId: 8, amendmentReason: 'Why' })])
    expect(notes.map((note) => [note.latest.id, ids(note.earlier)])).toEqual([[9, []]])
  })

  it('never loops on a cycle (which the database makes impossible)', () => {
    // 1 amends 2 and 2 amends 1, and 1 is (wrongly) unamended.
    const notes = groupIntoNotes([
      entry(1, { amendsId: 2, amendmentReason: 'x' }),
      entry(2, { amendsId: 1, amendmentReason: 'y', amendedById: 1 }),
    ])
    // The walk stops after as many steps as the file has entries.
    expect(notes.map((note) => [note.latest.id, ids(note.earlier)])).toEqual([[1, [2, 1]]])
  })

  it('is empty for an empty file', () => {
    expect(groupIntoNotes([])).toEqual([])
  })
})

describe('draftFrom', () => {
  it('copies the type and every section, absent ones as empty text, with no reason', () => {
    expect(draftFrom(entry(2, { subjective: 'S', plan: 'P', amendmentReason: 'old reason' }))).toStrictEqual({
      entryType: 'progress_note',
      subjective: 'S',
      objective: '',
      assessment: '',
      plan: 'P',
      reason: '',
    })
  })
})

describe('draftProblems — a new entry', () => {
  it('asks for a type and at least one section, in the order of the form', () => {
    expect(draftProblems(emptyDraft())).toEqual([
      { field: 'entryType', message: 'Choose the type of entry.' },
      {
        field: 'sections',
        message: 'Write at least one section: Subjective, Objective, Assessment or Plan.',
      },
    ])
  })

  it('counts a section of spaces or line breaks as not written', () => {
    const draft = { ...emptyDraft(), entryType: 'progress_note' as const, plan: ' \n\t ' }
    expect(draftProblems(draft).map((p) => p.field)).toEqual(['sections'])
  })

  it.each(['subjective', 'objective', 'assessment', 'plan'] as const)(
    'accepts an entry with only %s',
    (section) => {
      expect(draftProblems({ ...emptyDraft(), entryType: 'discharge_summary', [section]: 'x' })).toEqual([])
    },
  )

  it("doesn't ask for a reason", () => {
    expect(draftProblems({ ...emptyDraft(), entryType: 'progress_note', plan: 'P' })).toEqual([])
  })
})

describe('draftProblems — an amendment', () => {
  const original = entry(2, { objective: 'Left knee', plan: 'Keep going' })

  it('asks for a reason, and accepts a changed draft with one', () => {
    const changed = { ...draftFrom(original), objective: 'Right knee' }
    expect(draftProblems(changed, original)).toEqual([
      { field: 'reason', message: 'Say why you are amending this entry.' },
    ])
    expect(draftProblems({ ...changed, reason: ' \n' }, original).map((p) => p.field)).toEqual(['reason'])
    expect(draftProblems({ ...changed, reason: 'Wrong knee' }, original)).toEqual([])
  })

  it('refuses a draft identical to the original — and says so BEFORE the reason', () => {
    expect(draftProblems(draftFrom(original), original)).toEqual([
      {
        field: 'sections',
        message: 'Nothing has changed yet: correct the entry before saving the amendment.',
      },
      { field: 'reason', message: 'Say why you are amending this entry.' },
    ])
  })

  it('compares what would be STORED: spaces around a section are not a change', () => {
    const draft = { ...draftFrom(original), plan: '  Keep going \n', reason: 'Why' }
    expect(draftProblems(draft, original).map((p) => p.field)).toEqual(['sections'])
  })

  it('counts a new type, a new section, or a section removed as a change', () => {
    const base = { ...draftFrom(original), reason: 'Why' }
    expect(draftProblems({ ...base, entryType: 'discharge_summary' }, original)).toEqual([])
    expect(draftProblems({ ...base, subjective: 'Added' }, original)).toEqual([])
    expect(draftProblems({ ...base, objective: '' }, original)).toEqual([])
  })

  it('still needs at least one section', () => {
    const draft = { ...draftFrom(original), objective: '', plan: '', reason: 'Why' }
    expect(draftProblems(draft, original).map((p) => p.field)).toEqual(['sections'])
  })
})

describe('entryBody', () => {
  it('sends the written sections, trimmed at their edges, and leaves the others out', () => {
    expect(
      entryBody(
        { ...emptyDraft(), entryType: 'initial_assessment', subjective: '  Pain\non stairs  ', objective: '   ', plan: 'P' },
        6,
      ),
    ).toStrictEqual({ patientId: 6, entryType: 'initial_assessment', subjective: 'Pain\non stairs', plan: 'P' })
  })

  it('adds the version it amends and the trimmed reason for an amendment', () => {
    expect(
      entryBody({ ...emptyDraft(), entryType: 'progress_note', plan: 'P', reason: ' Wrong knee ' }, 6, 2),
    ).toStrictEqual({
      patientId: 6,
      entryType: 'progress_note',
      plan: 'P',
      amendsId: 2,
      amendmentReason: 'Wrong knee',
    })
  })

  it('sends no reason for a new entry, even if one was typed', () => {
    expect(entryBody({ ...emptyDraft(), entryType: 'progress_note', plan: 'P', reason: 'x' }, 6)).toStrictEqual({
      patientId: 6,
      entryType: 'progress_note',
      plan: 'P',
    })
  })
})