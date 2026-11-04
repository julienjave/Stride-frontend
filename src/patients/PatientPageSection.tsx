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

import type { ReactNode, Ref } from 'react'

// One titled block of the patient page. <section> + aria-labelledby makes
// each block a NAMED region: a screen reader can list "Programs, Care team,
// Invitation…" and jump straight to one — the same pattern as the profile
// page's ProfileSection.
export function PatientPageSection({
  title,
  action,
  children,
  headingRef,
}: {
  title: string
  // Optional control shown on the heading's line (e.g. "Show past members").
  action?: ReactNode
  children: ReactNode
  // The section's focus target after a "Try again" that worked
  // (useRetryFocus). Given → focusable by code (tabIndex -1), not by Tab.
  headingRef?: Ref<HTMLHeadingElement>
}) {
  const headingId = `patient-section-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          id={headingId}
          className="text-base font-semibold outline-none"
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}