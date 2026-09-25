import { Monitor, Moon, Settings, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/theme/ThemeContext'
import { parseThemePreference, type ThemePreference } from '@/theme/theme'

// The options in display order. Kept as data so the menu is a simple map,
// and adding a fourth theme later is a one-line change.
const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// Settings, design decisions §1: a menu that starts with ONE option, the
// theme. It's a menu rather than a single toggle button on purpose — the
// likely second option (default weight unit) then slots in as another
// labeled group, without redesigning the top bar.
export function SettingsMenu() {
  const { preference, setPreference } = useTheme()

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
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {/* A RADIO group, not three plain items: exactly one theme is ever
            chosen, and radio semantics (role="menuitemradio" +
            aria-checked) tell assistive tech that directly, and draw the
            check mark for free. */}
        <DropdownMenuRadioGroup
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}