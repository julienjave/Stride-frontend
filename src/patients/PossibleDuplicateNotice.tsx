import { useEffect, useId, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  DUPLICATE_IN_YOUR_CLINICS_TEXT,
  duplicateElsewhereText,
  goAheadLabel,
  POSSIBLE_DUPLICATE_HEADING,
  POSSIBLE_DUPLICATE_TEXT,
  type PractitionerDuplicateWarning,
} from '@/users/possibleDuplicate'
import { DirectoryPatientRow } from './DirectoryPatientRow'

interface PossibleDuplicateNoticeProps {
  warning: PractitionerDuplicateWarning
  // The person the warning is about — the names the server compared, which
  // may differ from what's in the form now if it was edited since.
  firstName: string
  lastName: string
  goingAhead: boolean
  onGoAhead: () => void
  // A match from my clinics was added to my patients.
  onAdded: (name: string) => void
}

// The invite page's possible-duplicate warning (decisions §27, pass 2) —
// shown INSTEAD of an error: nothing went wrong, the server is asking
// "are you sure?" with what the practitioner may know.
//   - Matches from my clinics come as directory rows, with the directory's
//     own action ("Add to my patients", or "Open" if mine) — adding the
//     existing patient is the better answer, so it comes first.
//   - Matches I can't see are one sentence: "check with an admin".
//   - "Invite … anyway" sends the SAME person again with the go-ahead. Its
//     label names them: if the form was edited since, the button still says
//     who it is about (a normal submit checks the new names afresh).
// Focus moves to the heading when it appears: the warning replaces what a
// keyboard or screen-reader user was doing (pressing Send), and must be
// read before the next step.
export function PossibleDuplicateNotice({
  warning,
  firstName,
  lastName,
  goingAhead,
  onGoAhead,
  onAdded,
}: PossibleDuplicateNoticeProps) {
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
      {warning.inYourClinics.length > 0 && (
        <>
          <p>{DUPLICATE_IN_YOUR_CLINICS_TEXT}</p>
          <ul className="divide-y divide-border rounded-lg border bg-background">
            {warning.inYourClinics.map((patient) => (
              <DirectoryPatientRow
                key={patient.id}
                patient={patient}
                onAdded={() => onAdded(`${patient.firstName} ${patient.lastName}`)}
              />
            ))}
          </ul>
        </>
      )}
      {warning.elsewhere && (
        <p>{duplicateElsewhereText(warning.inYourClinics.length > 0)}</p>
      )}
      <Button type="button" variant="outline" onClick={onGoAhead} disabled={goingAhead}>
        {goingAhead ? 'Inviting…' : goAheadLabel('Invite', firstName, lastName)}
      </Button>
    </section>
  )
}