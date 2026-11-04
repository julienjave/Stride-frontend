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

import { useQuery } from '@tanstack/react-query'
import { LoadError } from '@/common/LoadError'
import { ListSkeleton } from '@/common/Loading'
import { useRetryFocus } from '@/common/useRetryFocus'
import { listOwnLegalDisclosures, OWN_LEGAL_DISCLOSURES_QUERY_KEY } from './api'
import { legalBasisText, partsText, periodText, sharedHeading } from './legalDisclosureRules'

// "When your record was shared" on My records (decisions §25, pass 3): the
// patient's ACCOUNTING OF DISCLOSURES (HIPAA 164.528) — each time the clinic
// gave their record to someone outside it because the law required it: who
// received it, why, when, and what (the parts, and the period they covered).
// The same list closes their own PDF copy.
//
// A disclosure an agency asked the clinic to hold back isn't here until its
// day: the server leaves it out, down to the database — this screen can't
// show one early by mistake.
//
// Its own request, its own section: shown whatever the notes' list does.
export function SharedRecordSection() {
  const shared = useQuery({
    queryKey: OWN_LEGAL_DISCLOSURES_QUERY_KEY,
    queryFn: listOwnLegalDisclosures,
  })
  // After a "Try again" that worked, focus goes to the section's heading.
  const heading = useRetryFocus<HTMLHeadingElement>(
    'when your record was shared',
    shared.isSuccess,
  )

  return (
    <section aria-labelledby="shared-record-heading" className="space-y-3 rounded-lg border px-4 py-3">
      <h2
        ref={heading}
        tabIndex={-1}
        id="shared-record-heading"
        className="text-sm font-medium outline-none"
      >
        When your record was shared
      </h2>
      <p className="text-sm text-muted-foreground">
        When the law requires it — a court order, for example — a clinic may have to give a copy
        of a record to someone outside it without asking first. Each time that happened with your
        record is listed here. Copies you download yourself aren't.
      </p>
      {shared.isError ? (
        <LoadError what="when your record was shared" queries={[shared]} />
      ) : !shared.isSuccess ? (
        <ListSkeleton label="Loading when your record was shared…" rows={1} />
      ) : shared.data.length === 0 ? (
        <p className="text-sm">Your record hasn't been shared outside the clinic.</p>
      ) : (
        // Newest first, as the backend lists them.
        <ul aria-label="Times your record was shared" className="space-y-2">
          {shared.data.map((disclosure) => (
            <li key={disclosure.id} className="space-y-1 rounded-lg border p-3 text-sm">
              <p className="font-medium">{sharedHeading(disclosure)}</p>
              <p>
                <span className="font-medium">Why: </span>
                {legalBasisText(disclosure.legalBasis, disclosure.basisExplanation)}
              </p>
              <p>
                <span className="font-medium">What: </span>
                {partsText(disclosure.parts)}
              </p>
              <p>
                <span className="font-medium">Period: </span>
                {periodText(disclosure.periodFrom, disclosure.periodTo)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
