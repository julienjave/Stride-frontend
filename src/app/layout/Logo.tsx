import { Link } from 'react-router'
import { cn } from '@/lib/utils'
// Importing an image file in Vite gives back its URL (in production, a
// file name with a content hash, so a new logo is never served from an old
// cache). The two lockups are the person's own (design decisions §39): the
// S mark followed by "tride" — black for the light theme, white for the
// dark — with the letters converted to curves, so they need no font.
import logoLight from '@/assets/stride-light.svg'
import logoDark from '@/assets/stride-dark.svg'

interface LogoProps {
  // Where "home" is for the current user — AuthenticatedLayout passes
  // roleHomePath(activeRole). Linking there directly, rather than to `/`,
  // skips DashboardRedirect's extra redirect hop.
  homePath: string
  className?: string
}

// The Stride logo, linking home. Kept in its own component since §1, so
// swapping the text placeholder for the real logo touched only this file.
//
// WHY TWO IMAGES: the theme can be chosen by hand (Settings → light / dark /
// system), so the operating system's `prefers-color-scheme` — what a
// <picture> with a media query would follow — can disagree with the page.
// What decides is the `.dark` class on <html>, set by index.html's pre-paint
// script before anything is drawn. Both images are in the page, and
// Tailwind's `dark:` variant (`&:is(.dark *)` in index.css) shows the right
// one: `dark:hidden` on the light logo, `hidden dark:block` on the dark one.
// So the right logo is there from the first paint, with no JavaScript
// deciding — and no flash of the wrong one. (The hidden one is still
// downloaded: about 9 kB, under 3 kB compressed, once, then cached.)
//
// WHY NOT ONE SVG WITH `currentColor`: an SVG loaded as an <img> is sealed
// off from the page — it can't read the page's CSS (or its fonts). Only an
// SVG written INTO the page could follow the text colour, which would need
// a build plugin turning SVG files into React components, for one logo.
export function Logo({ homePath, className }: LogoProps) {
  return (
    <Link
      to={homePath}
      // The link's accessible name. "Stride" alone would announce the
      // brand but not what clicking it does.
      aria-label="Stride home"
      // `shrink-0`: in the top bar's flex row, the logo never gets squeezed
      // by the sections next to it. `rounded-sm` shapes the focus outline.
      className={cn('flex shrink-0 items-center rounded-sm', className)}
    >
      {/* alt="": the link's aria-label already names it; images with text
          alternatives inside it would be read a second time. `h-7` (28 px)
          and `w-auto`: the height is chosen, the width follows the file's
          own proportions (its viewBox). */}
      <img src={logoLight} alt="" className="h-7 w-auto dark:hidden" />
      <img src={logoDark} alt="" className="hidden h-7 w-auto dark:block" />
    </Link>
  )
}