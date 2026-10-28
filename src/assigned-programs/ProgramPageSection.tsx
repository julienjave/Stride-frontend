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