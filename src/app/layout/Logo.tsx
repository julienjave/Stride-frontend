import { Link } from 'react-router'
import { cn } from '@/lib/utils'

interface LogoProps {
  // Where "home" is for the current user — AuthenticatedLayout passes
  // roleHomePath(activeRole). Linking there directly, rather than to `/`,
  // skips DashboardRedirect's extra redirect hop.
  homePath: string
  className?: string
}

// A text wordmark standing in for a real logo (design decisions §1: "a
// wordmark placeholder until one exists"). Isolated in its own component
// so swapping in the real asset later touches exactly this one file.
export function Logo({ homePath, className }: LogoProps) {
  return (
    <Link
      to={homePath}
      // The link's accessible name. "Stride" alone would announce the
      // brand but not what clicking it does.
      aria-label="Stride home"
      className={cn('text-lg font-semibold tracking-tight', className)}
    >
      Stride
    </Link>
  )
}