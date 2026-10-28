import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useDelayedShow } from './useDelayedShow'

// What a screen shows while its data is on the way (Phase 6, the loading /
// error pass, pass 2, 2026-10-28 — decisions §24, the person's choices):
//
// - NOTHING for the first 200 ms. Most answers come back faster than that;
//   showing "Loading…" for a frame or two and then the content reads as a
//   flicker, not as information. After 200 ms the wait is real, and the
//   screen says so.
// - Lists and the homes' cards show a SKELETON: grey shapes where the rows
//   or lines will be, so the page doesn't jump when they arrive and the eye
//   already knows where to look. Everything else (a page about one record,
//   a small section) shows a short sentence — a skeleton of a form or a
//   one-record page would be a guess at a layout that differs per record.
//
// FOR SCREEN READERS, both are the same thing: a `role="status"` region
// (a polite live region) holding the sentence. The region is on the page
// from the very first render, EMPTY during the delay, and the sentence is
// put INTO it — screen readers announce a change of a live region's
// content reliably, while a region that appears already holding text is
// announced by some and missed by others. A skeleton's shapes are
// `aria-hidden` (grey boxes mean nothing read aloud); its sentence is
// visually hidden (`sr-only`) but read.
//
// The delay itself: `useDelayedShow.ts`.
//
// The animation (`animate-pulse`) stops for people who asked their system
// for less motion (`motion-reduce:animate-none`): the shapes stay, still.

// The sentence: "Loading your patients…". `className` places the region
// (a page's margins); the sentence's own look is fixed.
export function Loading({ label = 'Loading…', className }: { label?: string; className?: string }) {
  const shown = useDelayedShow()
  return (
    <div role="status" className={className}>
      {shown && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  )
}

// One grey shape. Sized by the caller (`h-4 w-1/3`), like the text it
// stands for.
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)} />
}

// A skeleton with its sentence: the shapes are drawn by the caller (or by
// the two ready-made ones below), the sentence is for screen readers.
export function LoadingSkeleton({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  const shown = useDelayedShow()
  return (
    <div role="status" className={className}>
      {shown && (
        <>
          <span className="sr-only">{label}</span>
          <div aria-hidden="true">{children}</div>
        </>
      )}
    </div>
  )
}

// The rows of a list. Two shapes, as the app's lists come in two:
// - 'rows' (the default): one bordered frame divided into rows
//   (`divide-y rounded-lg border` — My patients, Users, Clinics…);
// - 'cards': each row its own bordered card, a little apart (`space-y-2` —
//   the Programs hub, the care team, the sessions hub…).
// Each row: an optional round photo, a name, a line under it. Three rows by
// default — enough to read as "a list is coming", few enough not to promise
// a length.
export function ListSkeleton({
  label,
  rows = 3,
  avatar = false,
  layout = 'rows',
  className,
}: {
  label: string
  rows?: number
  avatar?: boolean
  layout?: 'rows' | 'cards'
  className?: string
}) {
  return (
    <LoadingSkeleton label={label} className={className}>
      <div className={layout === 'rows' ? 'divide-y divide-border rounded-lg border' : 'space-y-2'}>
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className={cn('flex items-center gap-3 p-3', layout === 'cards' && 'rounded-lg border')}
          >
            {avatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </LoadingSkeleton>
  )
}

// The exercise library's grid of cards (a photo, a name under it), in the
// grid's own columns, so nothing moves when the cards arrive.
export function GridSkeleton({ label, items = 8 }: { label: string; items?: number }) {
  return (
    <LoadingSkeleton label={label}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="space-y-2 rounded-lg border p-3">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </LoadingSkeleton>
  )
}

// Lines of text inside a card that is already drawn (the homes' cards: the
// card's title stays, the lines under it are coming).
export function LinesSkeleton({
  label,
  lines = 2,
  className,
}: {
  label: string
  lines?: number
  className?: string
}) {
  return (
    <LoadingSkeleton label={label} className={className}>
      <div className="space-y-2">
        {Array.from({ length: lines }, (_, index) => (
          // The last line shorter, as a paragraph's last line usually is.
          <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-1/2' : 'w-4/5')} />
        ))}
      </div>
    </LoadingSkeleton>
  )
}