import { cn } from '@/lib/utils'
import { isOtherClinic } from './roster'
import type { ClinicRef } from './types'

// The clinic badge per patient (roadmap Phase 3: "a clinic filter and a
// clinic badge per patient — a user can belong to several clinics"). Used
// by the roster, the patient page and the directory search, so they all
// label clinics the same way.
//
// Neutral colours on purpose, unlike YoursBadge's primary tint: "Yours" is a
// highlight, a clinic name is just a fact, and several of them side by side
// shouldn't compete for attention with the patient's name.
//
// A <ul> because it IS a list (a screen reader announces "list, 2 items"),
// with `aria-label` saying what the list is about.
//
// MY CLINICS AND THE OTHERS (roadmap Phase 6.5, "Roster badges"). On My
// patients and the patient page a practitioner sees EVERY clinic the patient
// attends, including ones they don't work at (decided 2026-10-08: "Robin is
// also seen at Harbour" helps coordinate care). Until now every badge looked
// the same, so "mine" and "seen there too" couldn't be told apart. When the
// caller passes `myClinicIds`, a clinic outside that list is drawn with a
// DASHED outline and says, in words, "(not one of your clinics)":
//   - the words are visually hidden (`sr-only`) but read out — a screen
//     reader user gets the same fact as a sighted one. Style alone must never
//     carry a meaning (WCAG 1.4.1, "Use of color" — the same reasoning holds
//     for a border style);
//   - the text colour is NOT lightened: muted text at a lower opacity would
//     fall under the 4.5:1 contrast small text needs. The outline changes,
//     the name stays as readable as its neighbours;
//   - sighted users learn what the dashed outline means from a one-line key
//     the page shows once (`OtherClinicsKey` below), not from a tooltip — a
//     `title` never appears on a phone, where practitioners also work.
// Without `myClinicIds` (the directory search, whose clinics are by
// definition shared ones) every badge looks as it always did.
export function ClinicBadges({
  clinics,
  myClinicIds,
  className,
}: {
  clinics: readonly ClinicRef[]
  // The ids of the clinics the signed-in practitioner works at — from
  // /auth/me (`CurrentUser.clinics`). Optional: see above.
  myClinicIds?: readonly number[]
  className?: string
}) {
  // Nothing at all rather than an empty list element: an empty <ul> still
  // takes up space in a flex row and is announced as "list, 0 items".
  if (clinics.length === 0) return null

  return (
    <ul aria-label="Clinics" className={cn('flex flex-wrap gap-1', className)}>
      {clinics.map((clinic) => {
        const other = isOtherClinic(clinic, myClinicIds)
        return (
          <li
            key={clinic.id}
            className={cn(
              'inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs text-muted-foreground',
              other && 'border-dashed border-muted-foreground/60',
            )}
          >
            {clinic.name}
            {/* The leading space is INSIDE the hidden span, so the visible
                badge has no trailing gap; a screen reader reads "Harbour
                Sports Clinic (not one of your clinics)". */}
            {other && <span className="sr-only"> (not one of your clinics)</span>}
          </li>
        )
      })}
    </ul>
  )
}

// The one-line key under a list (or a header) where dashed badges can
// appear. A <p>, visible to everyone: hidden from screen readers would be
// defensible (each badge already says it), but a sentence the eye can read
// and the ear can't is a small mismatch for nothing — it is short.
export function OtherClinicsKey({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
      {/* A miniature of the badge's outline — decoration, the words say it.
          `shrink-0`: when the sentence wraps (a phone), flex would otherwise
          squeeze the outline into a circle. */}
      <span
        aria-hidden="true"
        className="inline-block h-3 w-5 shrink-0 rounded-full border border-dashed border-muted-foreground/60"
      />
      Dashed outline: a clinic you don't work at — the patient is also seen there.
    </p>
  )
}