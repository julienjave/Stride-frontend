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
import { CHANGE_PASSWORD_PATH } from './passwordChangeRules'

// The Password row of the person's OWN profile, in its "Sign-in and
// security" section (decisions §13 — the person's choice: Email and Password
// together, where two-factor sign-in would join them). Laid out like the
// profile's other rows: the label, then the action on the right.
//
// No value to show — a password is never sent to the browser, not even
// masked. The dots say "there is one" to the eye; a screen reader is told
// nothing it can't use (aria-hidden), and reads the row's label and its
// "Change Password" link.
export function PasswordRow() {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Password</p>
        <p aria-hidden="true">••••••••</p>
      </div>
      {/* A link, not a button: it opens a page. Named "Change Password"
          like the Email row's "Change Email" — the section's two "Change"
          links must be told apart. */}
      <Button asChild variant="ghost" size="sm">
        <Link to={CHANGE_PASSWORD_PATH} aria-label="Change Password">
          Change
        </Link>
      </Button>
    </div>
  )
}