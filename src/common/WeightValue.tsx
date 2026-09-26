import { usePreferredWeightUnit } from '@/auth/usePreferredWeightUnit'
import { formatWeight, type WeightUnit } from './weight'

interface WeightValueProps {
  // The weight exactly as stored — as prescribed.
  weight: number
  unit: WeightUnit
}

// A stored weight, shown in the viewer's preferred unit:
//   - same unit:  "62.5 kg"
//   - converted:  "44.1 lbs (20 kg)" — the value in parentheses is the
//     prescription itself, so a converted (rounded) number is never
//     mistaken for what was actually prescribed.
//
// A component, not just formatWeight(), because it needs a hook (the
// preference) and renders two differently-styled parts. It renders no
// wrapper element of its own — just text, plus a <span> for the
// prescribed part — so it sits inside whatever line it's placed in
// ("3 sets · 10 reps · 62.5 kg") without changing that line's layout.
export function WeightValue({ weight, unit }: WeightValueProps) {
  const preferredUnit = usePreferredWeightUnit()
  const { display, prescribed } = formatWeight(weight, unit, preferredUnit)

  return (
    <>
      {display}
      {prescribed && <span className="text-muted-foreground"> ({prescribed})</span>}
    </>
  )
}