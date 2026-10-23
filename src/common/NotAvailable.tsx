import type { ReactNode } from 'react'
import { Link } from 'react-router'

// The page shown when a record can't be shown — Phase 6, "Honest empty /
// error states for the RLS 404s" (decided 2026-10-23).
//
// WHY ONE COMPONENT: four resources (assigned programs, sessions,
// conversations, medical-file entries) answer 404 for two different
// situations the backend deliberately doesn't tell apart: the record doesn't
// exist, or it exists but row-level security hides it from this viewer.
// Telling them apart would confirm that a hidden record exists (an id that
// says "not yours" proves someone has that program). So every such page
// says what is true of BOTH — and before this item, each page said it its
// own way: some with a heading, some without, some with no way out.
//
// The shape, everywhere: a heading ("Program not available" — "not
// available" rather than "not found", because the record may well exist),
// one sentence naming both possibilities, and links to where the viewer can
// go next. The words are the CALLER's (each resource has its own rule to
// state); this component fixes only the shape.
export interface NotAvailableLink {
  to: string
  label: string
}

export function NotAvailable({
  title,
  children,
  links,
  headingLevel = 1,
}: {
  title: string
  // The sentence: both possibilities, in the viewer's terms.
  children: ReactNode
  // At least one way out — a page with none is a dead end.
  links: [NotAvailableLink, ...NotAvailableLink[]]
  // 1 for a page of its own; 2 inside a page that already has its <h1> (the
  // conversation pane, beside the list's "Messages").
  headingLevel?: 1 | 2
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2'
  return (
    <div className="space-y-3">
      <Heading className="text-xl font-semibold">{title}</Heading>
      {/* role="alert": the page first showed "Loading…", and this replaces
          it without moving focus — the alert makes a screen reader say it. */}
      <p role="alert" className="text-sm text-muted-foreground">
        {children}
      </p>
      {/* A plain row of links, not a <nav>: a landmark per error page would
          only add noise to a screen reader's list of landmarks. */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {links.map((link) => (
          <Link key={link.to} to={link.to} className="font-medium underline underline-offset-4">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}