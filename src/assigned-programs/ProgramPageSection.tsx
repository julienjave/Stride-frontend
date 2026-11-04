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

import { type Ref, useId, type ReactNode } from 'react'

// One titled block of the program page — the same pattern as the patient
// page's PatientPageSection: <section> + aria-labelledby makes it a NAMED
// region, so a screen reader can list "Schedule & progress, Exercises" and
// jump to one. The heading's id comes from useId() — unique however many
// sections the page has, with no rule for turning a title into an id.
export function ProgramPageSection({
  title,
  children,
  headingRef,
}: {
  title: string
  children: ReactNode
  // The section's focus target after a "Try again" that worked
  // (useRetryFocus) — the progress, in "Schedule & progress". Given → the
  // heading is focusable by code (tabIndex -1), not by Tab.
  headingRef?: Ref<HTMLHeadingElement>
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <h2
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        id={headingId}
        className="text-base font-semibold outline-none"
      >
        {title}
      </h2>
      {children}
    </section>
  )
}