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