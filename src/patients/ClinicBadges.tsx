import { cn } from '@/lib/utils'
import type { ClinicRef } from './types'

// The clinic badge per patient (roadmap Phase 3: "a clinic filter and a
// clinic badge per patient — a user can belong to several clinics"). Used
// by the roster and by the directory search, so both label clinics the same
// way.
//
// Neutral colours on purpose, unlike YoursBadge's primary tint: "Yours" is a
// highlight, a clinic name is just a fact, and several of them side by side
// shouldn't compete for attention with the patient's name.
//
// A <ul> because it IS a list (a screen reader announces "list, 2 items"),
// with `aria-label` saying what the list is about.
export function ClinicBadges({
  clinics,
  className,
}: {
  clinics: readonly ClinicRef[]
  className?: string
}) {
  // Nothing at all rather than an empty list element: an empty <ul> still
  // takes up space in a flex row and is announced as "list, 0 items".
  if (clinics.length === 0) return null

  return (
    <ul aria-label="Clinics" className={cn('flex flex-wrap gap-1', className)}>
      {clinics.map((clinic) => (
        <li
          key={clinic.id}
          className="inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
        >
          {clinic.name}
        </li>
      ))}
    </ul>
  )
}