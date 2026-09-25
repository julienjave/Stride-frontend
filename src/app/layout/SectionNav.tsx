import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/auth/schemas'
import { SECTIONS_BY_ROLE } from './sections'

interface SectionNavProps {
  role: UserRole
  // Same links, two placements (design decisions §1):
  //   - 'top'    — inside the top bar on tablet/desktop
  //   - 'bottom' — the fixed tab bar on phones
  // One component with a variant, rather than two components, because the
  // CONTENT is identical and only the styling differs. Two copies would
  // be two places to forget when a section is added.
  variant: 'top' | 'bottom'
  className?: string
}

export function SectionNav({ role, variant, className }: SectionNavProps) {
  const sections = SECTIONS_BY_ROLE[role]

  return (
    // <nav> + aria-label makes this a named "navigation" landmark: screen
    // reader users can jump straight to it. Both variants carry the same
    // label, which is correct — CSS hides one of them at any given width,
    // and display:none also removes an element from the accessibility
    // tree, so a real user only ever encounters one "Sections" landmark.
    <nav aria-label="Sections" className={className}>
      <ul
        className={cn(
          'flex',
          variant === 'top' ? 'gap-1' : 'justify-around',
        )}
      >
        {sections.map(({ label, to, icon: Icon, end }) => (
          // `flex-1` on phones: every tab gets an equal share of the width,
          // making each one as large a tap target as possible.
          <li key={to} className={cn(variant === 'bottom' && 'flex-1')}>
            <NavLink
              to={to}
              end={end}
              // NavLink passes { isActive } to a className FUNCTION — that's
              // how the current section gets highlighted. It also sets
              // aria-current="page" on the active link automatically, so
              // assistive tech announces "current page" with no extra
              // work (and the tests assert on exactly that attribute).
              className={({ isActive }) =>
                cn(
                  // Icon ABOVE its label, per §1, in both variants.
                  'flex flex-col items-center gap-0.5 rounded-md text-xs font-medium transition-colors',
                  variant === 'top' ? 'px-3 py-1.5' : 'py-2',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                  isActive && variant === 'top' && 'bg-muted',
                )
              }
            >
              {/* Decorative: the label right under it already names the
                  link, so the icon would only be announced as noise. */}
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}