import type { ReactNode } from 'react'

// The frame of the two link pages (confirm, cancel): a narrow column with
// its heading, like the reset and accept pages — opened from an email, maybe
// on a phone, signed in or not.
export function LinkPageLayout({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-24 max-w-sm space-y-4 px-4">
      <h1 className="text-xl font-semibold">{heading}</h1>
      {children}
    </div>
  )
}