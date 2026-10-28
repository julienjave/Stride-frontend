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