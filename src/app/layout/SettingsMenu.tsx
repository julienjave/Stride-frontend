import { useId } from 'react'
import { Monitor, Moon, Settings, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/theme/ThemeContext'
import { parseThemePreference, type ThemePreference } from '@/theme/theme'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { usePreferredWeightUnit } from '@/auth/usePreferredWeightUnit'
import { useSetPreferredWeightUnit } from '@/auth/useSetPreferredWeightUnit'
import { isWeightUnit, WEIGHT_UNITS } from '@/common/weight'

// The options in display order. Kept as data so the menu is a simple map,
// and adding a fourth theme later is a one-line change.
const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// Settings, design decisions §1: a menu of labeled groups, one per
// setting — the theme, then the weight unit.
//
// The two are stored very differently, on purpose:
//   - Theme: in THIS browser (localStorage). It's about the device — you
//     may want dark on your phone and light on your desktop.
//   - Weight unit: on the ACCOUNT (the backend). It's about the person —
//     the unit you think in is the same on every device, and it has to
//     follow you when you log in somewhere else.
export function SettingsMenu() {
  const { preference, setPreference } = useTheme()
  const { data: currentUser } = useCurrentUser()
  const weightUnit = usePreferredWeightUnit()
  // Called HERE, in the always-mounted menu, not inside the dropdown's
  // content: picking an item closes the menu and unmounts that content,
  // and the error message below must survive that (see the hook).
  const setWeightUnit = useSetPreferredWeightUnit()
  // Each radio group is NAMED by its visible label (aria-labelledby →
  // the label's id). With two groups in one menu, "Light" and "kg" are
  // otherwise just menu items in a row; named groups let a screen reader
  // say "Weight unit, group" — and let tests find each group by name.
  const themeLabelId = useId()
  const weightUnitLabelId = useId()

  return (
    <DropdownMenu>
      {/* asChild: Radix's Trigger doesn't render its own <button>; it hands
          its behavior (open on click, aria-expanded, keyboard support) to
          OUR Button, so there's exactly one real button element with the
          app's normal button styling. */}
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel id={themeLabelId}>Theme</DropdownMenuLabel>
        {/* A RADIO group, not three plain items: exactly one theme is ever
            chosen, and radio semantics (role="menuitemradio" +
            aria-checked) tell assistive tech that directly, and draw the
            check mark for free. */}
        <DropdownMenuRadioGroup
          aria-labelledby={themeLabelId}
          value={preference}
          // Radix types the value as a plain string. Passing it through the
          // same parser used for localStorage turns it back into a
          // ThemePreference without an unchecked `as` cast.
          onValueChange={(value) => setPreference(parseThemePreference(value))}
        >
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <Icon aria-hidden="true" />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        {/* Only with a logged-in user: the setting belongs to an account.
            In practice always true — the menu lives in the logged-in
            layout — but the type allows null, and this says what to do
            then instead of asserting it can't happen. */}
        {currentUser && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel id={weightUnitLabelId}>Weight unit</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              aria-labelledby={weightUnitLabelId}
              value={weightUnit}
              onValueChange={(value) => {
                // Same idea as parseThemePreference above: Radix gives a
                // plain string, and the type guard proves it's a real
                // unit before it goes anywhere near the API.
                if (isWeightUnit(value) && value !== weightUnit) {
                  setWeightUnit.mutate({ userId: currentUser.id, unit: value })
                }
              }}
            >
              {WEIGHT_UNITS.map((unit) => (
                <DropdownMenuRadioItem key={unit} value={unit}>
                  {unit}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {/* The pick closed the menu, and a failure has already put the
                old unit back — so the explanation waits here, for the next
                time the menu is opened. It clears itself on the next pick
                (each mutate() starts a fresh mutation state). role="alert"
                makes screen readers announce it when it appears. */}
            {setWeightUnit.isError && (
              <p role="alert" className="px-2 py-1.5 text-xs text-destructive">
                Couldn't save your weight unit. Try again.
              </p>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}