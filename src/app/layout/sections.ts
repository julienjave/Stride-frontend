import {
  Building2,
  CalendarCheck,
  ClipboardList,
  Dumbbell,
  House,
  MessageSquare,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/auth/schemas'
import { roleHomePath } from '@/app/roleHomePath'

// One entry in the persistent navigation (design decisions §1).
export interface NavSection {
  label: string
  to: string
  icon: LucideIcon
  // React Router's NavLink treats a link as "active" when the current URL
  // STARTS WITH its path — which is what we want for sections: while
  // editing /practitioner/programs/templates/5, "Programs" should still be
  // highlighted. But every practitioner URL starts with /practitioner, so
  // Home would light up everywhere. `end: true` switches Home to an exact
  // match. Only Home needs it.
  end?: boolean
}

// THE single source of truth for "which sections does each role see."
// Both the desktop top bar and the phone tab bar render from this list, so
// they can never disagree about what exists or where it points.
//
// Deliberate choices:
//   - Home comes first for every role and is built from roleHomePath(), so
//     the nav and the post-login/post-role-switch redirects can't point at
//     two different "homes."
//   - Profile is NOT a section — it lives in the account menu, which is
//     what keeps every role at five tabs or fewer (a phone tab bar's
//     practical ceiling; sections.test.ts enforces it).
//   - Every section has its real page since Phase 5 (Messages was the last
//     "Coming soon"); the tabs were all there from the start, so the nav's
//     shape never changed as features shipped.
export const SECTIONS_BY_ROLE: Record<UserRole, NavSection[]> = {
  practitioner: [
    { label: 'Home', to: roleHomePath('practitioner'), icon: House, end: true },
    { label: 'Patients', to: '/practitioner/patients', icon: Users },
    { label: 'Library', to: '/practitioner/library', icon: Dumbbell },
    { label: 'Programs', to: '/practitioner/programs', icon: ClipboardList },
    { label: 'Messages', to: '/practitioner/messages', icon: MessageSquare },
  ],
  patient: [
    { label: 'Home', to: roleHomePath('patient'), icon: House, end: true },
    { label: 'Sessions', to: '/patient/sessions', icon: CalendarCheck },
    { label: 'Team', to: '/patient/team', icon: Stethoscope },
    { label: 'Messages', to: '/patient/messages', icon: MessageSquare },
  ],
  admin: [
    { label: 'Home', to: roleHomePath('admin'), icon: House, end: true },
    { label: 'Clinics', to: '/admin/clinics', icon: Building2 },
    { label: 'Users', to: '/admin/users', icon: Users },
  ],
}