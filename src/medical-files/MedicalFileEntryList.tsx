import { useId, useState } from 'react'
import { Link } from 'react-router'
import { groupIntoNotes, type Note } from './medicalFileRules'
import {
  SECTION_LABELS,
  amendsText,
  authorText,
  earlierToggleText,
  entryHeading,
  replacedText,
  type Audience,
} from './medicalFileText'
import { SECTIONS, type MedicalFileEntry } from './types'

// The entries of a medical file, as NOTES (decisions §8): each note's latest
// version, the versions it replaced folded under it behind "Show the
// original". Shared by the practitioner's page and the patient's "My
// records" — the words change with `audience`; only the practitioner gets
// `amendHref` (patients read, never write).
export function MedicalFileEntryList({
  entries,
  audience,
  amendHref,
}: {
  entries: MedicalFileEntry[]
  audience: Audience
  amendHref?: (entry: MedicalFileEntry) => string
}) {
  // A list of <li><article>: a screen reader announces "list, N items" and
  // each note is a landmark-like article named by its heading.
  return (
    <ol aria-label="Entries" className="space-y-4">
      {groupIntoNotes(entries).map((note) => (
        <NoteCard key={note.latest.id} note={note} audience={audience} amendHref={amendHref} />
      ))}
    </ol>
  )
}

function NoteCard({
  note,
  audience,
  amendHref,
}: {
  note: Note
  audience: Audience
  amendHref?: (entry: MedicalFileEntry) => string
}) {
  const { latest, earlier } = note
  const [showEarlier, setShowEarlier] = useState(false)
  // useId: a unique id per card, for the heading the article is named by and
  // for the region the toggle controls (aria-controls) — two cards on one
  // page must never share one.
  const id = useId()
  return (
    <li>
      <article aria-labelledby={`${id}-heading`} className="space-y-3 rounded-lg border p-4">
        <EntryContent
          entry={latest}
          audience={audience}
          headingId={`${id}-heading`}
          level={2}
          // The reason sits with the version that carries it; the original's
          // DATE comes from the version just below it in the chain.
          amends={earlier[0]}
        />
        <div className="flex flex-wrap items-center gap-3">
          {earlier.length > 0 && (
            // A disclosure button (aria-expanded) rather than <details>: the
            // closed content is simply not rendered, the same in jsdom and in
            // every browser.
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
              aria-label={`Amend: ${entryHeading(latest)}`}
            >
              Amend
            </Link>
          )}
        </div>
        {showEarlier && (
          <ol id={`${id}-earlier`} aria-label="Earlier versions" className="space-y-3">
            {earlier.map((entry, index) => (
              <li key={entry.id}>
                <article
                  aria-labelledby={`${id}-earlier-${entry.id}`}
                  className="space-y-3 rounded-md border border-dashed bg-muted/40 p-3"
                >
                  {/* Marked as replaced, by the version just above it. */}
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {replacedText(index === 0 ? latest : earlier[index - 1])}
                  </p>
                  <EntryContent
                    entry={entry}
                    audience={audience}
                    headingId={`${id}-earlier-${entry.id}`}
                    level={3}
                    amends={earlier[index + 1]}
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

// One version: heading, author, what it corrects (if it's an amendment), and
// the sections that were written, in SOAP order.
function EntryContent({
  entry,
  audience,
  headingId,
  level,
  amends,
}: {
  entry: MedicalFileEntry
  audience: Audience
  headingId: string
  level: 2 | 3
  amends: MedicalFileEntry | undefined
}) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <>
      <div className="space-y-0.5">
        <Heading id={headingId} className="text-base font-semibold">
          {entryHeading(entry)}
        </Heading>
        <p className="text-sm text-muted-foreground">{authorText(entry)}</p>
      </div>
      {/* `amends` is the version below this one in the chain — present
          exactly when this entry is an amendment. */}
      {amends && (
        <p className="text-sm">{amendsText(entry, amends, audience)}</p>
      )}
      <dl className="space-y-2">
        {SECTIONS.filter((section) => entry[section] !== null).map((section) => (
          <div key={section}>
            <dt className="text-sm font-medium">{SECTION_LABELS[audience][section]}</dt>
            {/* pre-wrap: the line breaks the practitioner typed are kept;
                wrap-break-word: a long word (a URL) can't widen the page. */}
            <dd className="text-sm whitespace-pre-wrap wrap-break-word">{entry[section]}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}