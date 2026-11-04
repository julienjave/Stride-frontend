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

import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  ADMIN_DUPLICATE_TEXT,
  POSSIBLE_DUPLICATE_HEADING,
  POSSIBLE_DUPLICATE_TEXT,
  type AdminDuplicateMatch,
} from './possibleDuplicate'

interface PossibleDuplicatesNoticeProps {
  matches: AdminDuplicateMatch[]
  // The button's words — they name the action and, when known, the person
  // ("Create Marie Martin anyway", "Grant the patient role anyway").
  goAheadLabel: string
  goingAhead: boolean
  onGoAhead: () => void
}

// The admin's possible-duplicate warning (decisions §27, pass 2), on
// "Add a user" and on "Grant a role": every match, as an admin may see
// every account — name, whether it's deactivated, its clinics — each a
// link to its user page to compare. The link opens a NEW TAB, said in
// words: leaving this page would lose the form being filled in. Then the
// go-ahead. Focus moves to the heading when it appears (the same reason as
// the practitioner's notice, src/patients/PossibleDuplicateNotice.tsx).
export function PossibleDuplicatesNotice({
  matches,
  goAheadLabel,
  goingAhead,
  onGoAhead,
}: PossibleDuplicatesNoticeProps) {
  const headingId = useId()
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
    >
      <h2 id={headingId} ref={heading} tabIndex={-1} className="font-semibold outline-none">
        {POSSIBLE_DUPLICATE_HEADING}
      </h2>
      <p>{POSSIBLE_DUPLICATE_TEXT}</p>
      <p>{ADMIN_DUPLICATE_TEXT}</p>
      <ul className="divide-y divide-border rounded-lg border bg-background">
        {matches.map((match) => (
          <li key={match.id} className="space-y-0.5 px-3 py-2">
            <Link
              to={`/admin/users/${match.id}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium underline"
              // Said in words, not only by an icon: a new tab is a change
              // of context a screen-reader user must expect. An aria-label
              // starting with the visible words (the project's rule for
              // names a hidden span would otherwise glue on).
              aria-label={`${match.firstName} ${match.lastName} (opens in a new tab)`}
            >
              {match.firstName} {match.lastName}
            </Link>
            {!match.isActive && <span className="text-muted-foreground"> · Deactivated</span>}
            <p className="text-muted-foreground">
              {match.clinics.length > 0
                ? match.clinics.map((clinic) => clinic.name).join(', ')
                : 'No clinic'}
            </p>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" onClick={onGoAhead} disabled={goingAhead}>
        {goingAhead ? 'Saving…' : goAheadLabel}
      </Button>
    </section>
  )
}