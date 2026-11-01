import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// A plain HTML <select>, styled like the app's Input.
//
// Why not the Radix Select used by the user forms? The assign form has a
// picker per scheduled day and per rotation position — many small, simple
// choices. The browser's own select:
// - opens the phone's native picker (a wheel on iOS, a sheet on Android),
//   the most comfortable way to choose on a small screen;
// - is accessible with no extra work (its label, keyboard, screen readers);
// - has no hidden-native-select echo to guard against (the
//   ignoreEmptySelection workaround Radix needed after a form reset);
// - is driven in tests with user.selectOptions(), like a real choice.
// What it gives up is custom styling of the open list, which nothing here
// needs.
//
// One thing about that list does need saying: its COLOURS. The open list is
// drawn by the browser, not the page. Chrome and Edge on Windows paint it
// with the select's background only when that background is opaque — ours
// is transparent (light) or 30% opaque (dark), so they fall back to the
// system's white, while each option still inherits the select's text
// colour: light grey on white in dark mode (found in live testing,
// 2026-10-12). So the options get explicit colours of their own — the
// theme's popover pair, the same as the app's other drop-down menus.
//
// The same for a GROUP's heading (<optgroup label="Knee">, 2026-11-01): the
// browser draws the label as its own row, painted by the <optgroup>, not by
// any <option> — so the options' colours didn't reach it, and in dark mode
// on Windows the joints of range of motion's movement picker, its visit
// notes' groups and the audit log's action groups were light grey on white
// (seen by the person; the options themselves were fine). The optgroup gets
// the same pair.
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-base outline-none [&_option]:bg-popover [&_option]:text-popover-foreground [&_optgroup]:bg-popover [&_optgroup]:text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30',
        className,
      )}
      {...props}
    />
  )
}