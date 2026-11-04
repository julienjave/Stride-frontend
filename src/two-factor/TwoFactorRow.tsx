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

import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { recoveryCodesLeftText, TWO_FACTOR_PATH } from './twoFactorRules'
import { useRecoveryCodesLeft } from './useRecoveryCodesLeft'

// The "Two-factor sign-in" row of the person's OWN profile, under Email and
// Password in "Sign-in and security" (decisions §14): Off → "Set up"; On →
// how many recovery codes are left → "Manage". Both lead to the two-factor
// page. Laid out like its neighbours (label above value, action right).
export function TwoFactorRow({ mfaEnabled }: { mfaEnabled: boolean }) {
  const left = useRecoveryCodesLeft(mfaEnabled)
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Two-factor sign-in</p>
        <p>{mfaEnabled ? 'On' : 'Off'}</p>
        {/* The count only once known: "On" alone is true meanwhile. With
            none left, the line says what it means (new codes, on the page). */}
        {mfaEnabled && left.data !== undefined && (
          <p
            className={
              left.data === 0 ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'
            }
          >
            {recoveryCodesLeftText(left.data)}
          </p>
        )}
      </div>
      {/* Named with the row's label, like "Change Email": the section's links
          must be told apart. */}
      <Button asChild variant="ghost" size="sm">
        <Link
          to={TWO_FACTOR_PATH}
          aria-label={mfaEnabled ? 'Manage two-factor sign-in' : 'Set up two-factor sign-in'}
        >
          {mfaEnabled ? 'Manage' : 'Set up'}
        </Link>
      </Button>
    </div>
  )
}