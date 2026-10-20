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
  // A count to show on a section's tab, keyed by the section's `to` — today
  // only Messages' unread count (Phase 5). Absent or 0 = no badge. Keyed by
  // address rather than a "messages" flag so the nav stays ignorant of what
  // the numbers mean: the layout decides, the nav only draws.
  badges?: Record<string, number>
}

export function SectionNav({ role, variant, className, badges = {} }: SectionNavProps) {
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
        {sections.map(({ label, to, icon: Icon, end }) => {
          const badge = badges[to] ?? 0
          return (
          // `flex-1` on phones: every tab gets an equal share of the width,
          // making each one as large a tap target as possible.
          <li key={to} className={cn(variant === 'bottom' && 'flex-1')}>
            <NavLink
              to={to}
              end={end}
              // With a badge, the accessible name says what the number is
              // ("Messages, 3 unread") — the badge itself is hidden from
              // screen readers, where a bare "3" would mean nothing.
              aria-label={badge > 0 ? `${label}, ${badge} unread` : undefined}
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
                  link, so the icon would only be announced as noise.
                  `relative` on the wrapper: the badge is positioned
                  against the icon, on its top-right corner. */}
              <span className="relative">
                <Icon className="size-5" aria-hidden="true" />
                {badge > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] leading-4 font-semibold text-primary-foreground"
                  >
                    {/* Past 99 the exact number stops mattering on a tab,
                        and would no longer fit. */}
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          </li>
          )
        })}
      </ul>
    </nav>
  )
}