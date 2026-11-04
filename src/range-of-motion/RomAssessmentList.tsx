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

import { useId, useState } from 'react'
import { Link } from 'react-router'
import { earlierToggleText, type Audience } from '@/medical-files/medicalFileText'
import type { MedicalFileEntry } from '@/medical-files/types'
import { groupIntoAssessments, type AssessmentVersions, type CatalogueIndex } from './romRules'
import {
  assessmentAmendsText,
  assessmentByline,
  assessmentHeading,
  degreesText,
  measurementLabel,
  replacedByText,
  visitNoteText,
} from './romText'
import type { RomAssessment } from './types'

// The heading levels this list is drawn at: under the practitioner page's
// "Assessments" (h3), under My records' "Each assessment" (h4) — its
// earlier versions one level down.
type HeadingLevel = 2 | 3 | 4 | 5
const HEADINGS = { 2: 'h2', 3: 'h3', 4: 'h4', 5: 'h5' } as const

// The ASSESSMENTS of a record, under the movement cards (decisions §36):
// newest measured first, each with its author, its number of values, the
// visit note it is linked to, and its values; an amended one folded under its
// correction, as in the medical file (MedicalFileEntryList — the same
// toggle, the same words). Only the practitioner gets `amendHref`.
export function RomAssessmentList({
  assessments,
  catalogue,
  notes,
  audience,
  headingLevel,
  amendHref,
}: {
  assessments: readonly RomAssessment[]
  catalogue: CatalogueIndex
  // The medical file, to name a linked note — undefined until it is read.
  notes: readonly MedicalFileEntry[] | undefined
  audience: Audience
  headingLevel: HeadingLevel
  amendHref?: (assessment: RomAssessment) => string
}) {
  return (
    <ol aria-label="Assessments" className="space-y-4">
      {groupIntoAssessments(assessments).map((versions) => (
        <AssessmentCard
          key={versions.latest.id}
          versions={versions}
          catalogue={catalogue}
          notes={notes}
          audience={audience}
          headingLevel={headingLevel}
          amendHref={amendHref}
        />
      ))}
    </ol>
  )
}

function AssessmentCard({
  versions,
  catalogue,
  notes,
  audience,
  headingLevel,
  amendHref,
}: {
  versions: AssessmentVersions
  catalogue: CatalogueIndex
  notes: readonly MedicalFileEntry[] | undefined
  audience: Audience
  headingLevel: HeadingLevel
  amendHref?: (assessment: RomAssessment) => string
}) {
  const { latest, earlier } = versions
  const [showEarlier, setShowEarlier] = useState(false)
  const id = useId()
  return (
    <li>
      <article aria-labelledby={`${id}-heading`} className="space-y-3 rounded-lg border p-4">
        <Version
          assessment={latest}
          amends={earlier[0]}
          catalogue={catalogue}
          notes={notes}
          audience={audience}
          headingId={`${id}-heading`}
          level={headingLevel}
        />
        <div className="flex flex-wrap items-center gap-3">
          {earlier.length > 0 && (
            <button
              type="button"
              aria-expanded={showEarlier}
              aria-controls={`${id}-earlier`}
              onClick={() => setShowEarlier((shown) => !shown)}
              className="text-sm underline underline-offset-4"
            >
              {earlierToggleText(earlier.length, showEarlier)}
            </button>
          )}
          {amendHref && (
            // On the LATEST version only: amending an older one would branch
            // the chain, which the backend refuses (409).
            <Link
              to={amendHref(latest)}
              className="ml-auto text-sm font-medium underline underline-offset-4"
              aria-label={`Amend: ${assessmentHeading(latest)}`}
            >
              Amend
            </Link>
          )}
        </div>
        {showEarlier && (
          <ol id={`${id}-earlier`} aria-label="Earlier versions" className="space-y-3">
            {earlier.map((version, index) => (
              <li key={version.id}>
                <article
                  aria-labelledby={`${id}-earlier-${version.id}`}
                  className="space-y-3 rounded-md border border-dashed bg-muted/40 p-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {replacedByText(index === 0 ? latest : earlier[index - 1])}
                  </p>
                  <Version
                    assessment={version}
                    amends={earlier[index + 1]}
                    catalogue={catalogue}
                    notes={notes}
                    audience={audience}
                    headingId={`${id}-earlier-${version.id}`}
                    level={(headingLevel + 1) as HeadingLevel}
                  />
                </article>
              </li>
            ))}
          </ol>
        )}
      </article>
    </li>
  )
}

// One version: the day measured, who and how many, the visit note, what it
// corrects (an amendment), and its values with their notes.
function Version({
  assessment,
  amends,
  catalogue,
  notes,
  audience,
  headingId,
  level,
}: {
  assessment: RomAssessment
  amends: RomAssessment | undefined
  catalogue: CatalogueIndex
  notes: readonly MedicalFileEntry[] | undefined
  audience: Audience
  headingId: string
  level: HeadingLevel
}) {
  const Heading = HEADINGS[level]
  return (
    <>
      <div className="space-y-0.5">
        <Heading id={headingId} className="text-base font-semibold">
          {assessmentHeading(assessment)}
        </Heading>
        <p className="text-sm text-muted-foreground">{assessmentByline(assessment)}</p>
        {assessment.medicalFileEntryId !== null && (
          <p className="text-sm text-muted-foreground">{visitNoteText(assessment.medicalFileEntryId, notes)}</p>
        )}
      </div>
      {amends && <p className="text-sm">{assessmentAmendsText(assessment, amends, audience)}</p>}
      <ul className="space-y-1 text-sm">
        {assessment.measurements.map((measurement) => (
          <li key={measurement.id} className="flex flex-wrap gap-x-2">
            <span>{measurementLabel(measurement, catalogue)}</span>
            <span className="font-semibold tabular-nums">{degreesText(measurement.degrees)}</span>
            {/* wrap-break-word: a long word can't widen the page. */}
            {measurement.note !== null && (
              <span className="w-full text-muted-foreground wrap-break-word">{measurement.note}</span>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}