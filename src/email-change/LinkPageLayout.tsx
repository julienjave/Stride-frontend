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

import type { ReactNode } from 'react'

// The frame of the two link pages (confirm, cancel): a narrow column with
// its heading, like the reset and accept pages — opened from an email, maybe
// on a phone, signed in or not.
export function LinkPageLayout({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-8 max-w-sm space-y-4 px-4">
      <h1 className="text-xl font-semibold">{heading}</h1>
      {children}
    </div>
  )
}