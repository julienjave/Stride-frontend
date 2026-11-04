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

import { LoadError } from '@/common/LoadError'
import { ListSkeleton } from '@/common/Loading'
import { useMyMedicalFile } from '@/medical-files/useMedicalFile'
import { MovementCards } from './MovementCards'
import { RomAssessmentList } from './RomAssessmentList'
import { indexCatalogue, movementCards } from './romRules'
import { PATIENT_INTRO } from './romText'
import { useMovementCatalogue, useMyRangeOfMotion } from './useRangeOfMotion'

// The patient's own range of motion — a section of My records, under the
// notes (decisions §36): the same movement cards as their practitioner's,
// read-only (no Record, no Amend), with the PDF copy's introduction — the
// typical value worded as a guide. Then the assessments themselves, every
// version (the whole record: HIPAA's right of access, as for the notes).
//
// Its own request (GET /range-of-motion — the patient's own, audited
// ROM_VIEWED) and its own loading and error states: the notes above don't
// wait for it, nor fail with it. The medical file it names linked notes from
// is the page's own query (the same cache key — no second request).
export function MyRangeOfMotion() {
  const record = useMyRangeOfMotion()
  const catalogue = useMovementCatalogue()
  const notes = useMyMedicalFile()
  const index = catalogue.data ? indexCatalogue(catalogue.data) : undefined

  return (
    <section aria-labelledby="my-rom-heading" className="space-y-3">
      <h2 id="my-rom-heading" className="text-lg font-semibold">
        Range of motion
      </h2>
      <p className="text-sm text-muted-foreground">{PATIENT_INTRO}</p>
      {record.isError || catalogue.isError ? (
        <LoadError what="your range of motion" queries={[record, catalogue]} />
      ) : !record.isSuccess || !index ? (
        <ListSkeleton label="Loading your range of motion…" rows={1} layout="cards" />
      ) : record.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Your care team hasn't measured any joints yet.</p>
      ) : (
        <>
          <MovementCards cards={movementCards(record.data, index)} audience="patient" />
          <h3 className="pt-2 text-base font-semibold">Each assessment</h3>
          <RomAssessmentList
            assessments={record.data}
            catalogue={index}
            notes={notes.data}
            audience="patient"
            headingLevel={4}
          />
        </>
      )}
    </section>
  )
}