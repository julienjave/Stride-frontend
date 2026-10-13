import { cn } from '@/lib/utils'
import { WeightValue } from './WeightValue'
import type { WeightUnit } from './weight'

// The fields of a prescription — what a template exercise and an assigned
// program's exercise both carry. Only these: TypeScript accepts any object
// that HAS them (structural typing), so both rows fit as they are.
export interface Prescription {
  sets: number | null
  reps: number | null
  durationInSeconds: number | null
  weight: number | null
  weightUnit: WeightUnit | null
}

// An exercise's prescription on one line: "3 sets · 10 reps · 30s · 20 kg".
// Moved out of the template's exercise card (2026-10-12) when the program
// page needed the same line: one wording for a prescription everywhere.
// Renders nothing when nothing is prescribed.
export function PrescriptionSummary({
  prescription,
  className,
}: {
  prescription: Prescription
  className?: string
}) {
  const parts: string[] = []
  // Truthy checks: 0 sets, 0 reps or a 0-second duration aren't
  // prescriptions anyone writes, and showing "0 sets" would only confuse.
  if (prescription.sets) parts.push(`${prescription.sets} sets`)
  if (prescription.reps) parts.push(`${prescription.reps} reps`)
  if (prescription.durationInSeconds) parts.push(`${prescription.durationInSeconds}s`)
  // != null, not a truthy check — a weight of exactly 0 is a real, if
  // unusual, value (the backend's hasStartedWeight reasoning), not the same
  // as "no weight set".
  //
  // Captured as its own small object, rather than re-reading the fields in
  // the JSX: inside this ternary TypeScript KNOWS both values are non-null,
  // and the object carries that knowledge along — so the JSX needs no `!`
  // assertions ("trust me, it's not null").
  const weight =
    prescription.weight != null && prescription.weightUnit != null
      ? { value: prescription.weight, unit: prescription.weightUnit }
      : null

  if (parts.length === 0 && !weight) return null

  // The weight isn't one of the plain-text parts: it's a component (shown in
  // the viewer's preferred unit, possibly converted — decisions §1), so it
  // comes after them, with its own separator when something is before it.
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {parts.join(' · ')}
      {weight && (
        <>
          {parts.length > 0 && ' · '}
          <WeightValue weight={weight.value} unit={weight.unit} />
        </>
      )}
    </p>
  )
}