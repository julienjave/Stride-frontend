import { useCurrentUser } from './useCurrentUser'
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { roleLabel } from './roleLabel'
import { userRoleSchema, type UserRole } from './schemas'

interface RoleSwitcherProps {
  // Called with the role the user picked. The CALLER performs the switch
  // (request + redirect) — see below for why this component must not.
  onSwitch: (role: UserRole) => void
  // True while a switch request is in flight, so the items can be
  // disabled and a double click can't fire two requests.
  isSwitching: boolean
}

// The role switcher lives INSIDE the account menu (design decisions §1). It
// renders menu items, so it must be placed inside a <DropdownMenuContent>
// — UserMenu is its only caller.
//
// It's a radio group listing EVERY role the account holds, with the active
// one ticked: the natural menu idiom for "exactly one of these is current".
//
// Why it only REPORTS the choice instead of switching itself: choosing an
// item closes the menu, and a closed Radix menu removes its contents —
// this component included — from the page. The switch request is still in
// flight at that moment. TanStack Query only runs a per-call onSuccess
// (the one passed to mutate()) if the component that called mutate() is
// still mounted when the request finishes, so a redirect placed there
// silently never happened. That was the "stays on the old home page after
// switching" bug. UserMenu stays mounted in the header the whole time, so
// it owns the request and the redirect, and hands this component a plain
// callback.
export function RoleSwitcher({ onSwitch, isSwitching }: RoleSwitcherProps) {
  const { data: user } = useCurrentUser()

  // Nothing to switch between on a single-role account, so no section at
  // all — not even its separator. That's why the separator lives HERE
  // rather than in UserMenu: returning null removes the whole block
  // cleanly, with no orphaned divider left behind.
  if (!user || user.roles.length <= 1) {
    return null
  }

  // Walking the schema's canonical list (admin, practitioner, patient) and
  // keeping the ones this account holds, rather than mapping user.roles
  // directly: the menu order stays the same for everyone regardless of
  // how the backend happens to order the array, and the result is already
  // typed UserRole[], with no cast needed.
  const heldRoles = userRoleSchema.options.filter((role) =>
    user.roles.includes(role),
  )

  function handleValueChange(value: string) {
    // Radix fires onValueChange even when the ALREADY-checked item is
    // clicked again; switching to the role you're in would be a pointless
    // request.
    if (value === user?.activeRole) {
      return
    }
    onSwitch(value as UserRole)
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Switch role</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={user.activeRole}
        onValueChange={handleValueChange}
      >
        {heldRoles.map((role) => (
          <DropdownMenuRadioItem key={role} value={role} disabled={isSwitching}>
            {roleLabel(role)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}