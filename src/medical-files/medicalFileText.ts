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

import { formatMomentDate } from '@/common/formatMomentDate'
import type { EntryType, MedicalFileEntry, Section } from './types'

// The words of the medical file screens, in one place — for the two
// audiences: the PRACTITIONER (clinical terms) and the PATIENT reading their
// own records (plain words; decisions §8).

export type Audience = 'practitioner' | 'patient'

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  initial_assessment: 'Initial assessment',
  progress_note: 'Progress note',
  discharge_summary: 'Discharge summary',
}

// The section headings. A practitioner reads SOAP's own names; a patient,
// what each one means for them. (Assessment and Plan say it already.)
export const SECTION_LABELS: Record<Audience, Record<Section, string>> = {
  practitioner: {
    subjective: 'Subjective',
    objective: 'Objective',
    assessment: 'Assessment',
    plan: 'Plan',
  },
  patient: {
    subjective: 'What you reported',
    objective: 'What was observed',
    assessment: 'Assessment',
    plan: 'Plan',
  },
}

// Under each field of the entry form: what goes in it.
export const SECTION_HINTS: Record<Section, string> = {
  subjective: 'What the patient reports: pain, history, goals.',
  objective: 'What you measured or observed.',
  assessment: 'Your clinical judgement.',
  plan: 'What happens next.',
}

// "Progress note · Oct 19, 2026" — the heading of one version.
export function entryHeading(entry: MedicalFileEntry): string {
  return `${ENTRY_TYPE_LABELS[entry.entryType]} · ${formatMomentDate(entry.createdAt)}`
}

export function authorText(entry: MedicalFileEntry): string {
  return `Written by ${entry.author.firstName} ${entry.author.lastName}`
}

// On an amendment: what it corrects, and why. The ORIGINAL's date (that's
// how a reader finds it), the reason as written.
export function amendsText(
  amendment: MedicalFileEntry,
  original: MedicalFileEntry,
  audience: Audience,
): string {
  const verb = audience === 'patient' ? 'Corrects' : 'Amends'
  return `${verb} the entry of ${formatMomentDate(original.createdAt)}: ${amendment.amendmentReason ?? ''}`
}

// The toggle revealing the earlier versions of a note.
export function earlierToggleText(count: number, shown: boolean): string {
  if (shown) return count === 1 ? 'Hide the original' : `Hide the ${count} earlier versions`
  return count === 1 ? 'Show the original' : `Show the ${count} earlier versions`
}

// On an earlier version: when it was replaced (= the next version's date).
export function replacedText(replacedBy: MedicalFileEntry): string {
  return `Amended on ${formatMomentDate(replacedBy.createdAt)}`
}