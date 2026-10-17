import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExerciseImage } from '@/exercises/types'

interface ExercisePhotoCarouselProps {
  // Only the URL is read. The library's photos also carry their objectKey
  // (its photos page needs it to reorder and remove); a program's photos
  // don't — so asking for `url` alone lets both be shown.
  images: Pick<ExerciseImage, 'url'>[]
  exerciseName: string
  // What to say when there's no photo — the default suits the library's
  // own pages; a program's page says where photos would come from.
  emptyText?: string
}

// View-only — deliberately not the reorderable, deletable gallery
// ExercisePhotosPage already has. That screen owns managing an
// exercise's photos; this one is just showing them for reference while
// picking sets/reps/weight, so a much simpler one-at-a-time carousel is
// all this needs.
export function ExercisePhotoCarousel({
  images,
  exerciseName,
  emptyText = 'No photos yet.',
}: ExercisePhotoCarouselProps) {
  const [index, setIndex] = useState(0)
  // What the browser has told us about each photo, by URL: 'loaded' (its
  // load event fired) or 'error'. Absent = still downloading. Kept per URL,
  // not as one flag, so going back to a photo already seen shows it at once.
  const [status, setStatus] = useState<Record<string, 'loaded' | 'error'>>({})

  // The photo shown: the remembered position, but never past the end. A
  // program's photos are read LIVE from the library (2026-10-14), so the list
  // can SHRINK while the page is open (a photo removed there, then a
  // refetch): position 3 of a list now 2 long would be `undefined` — and
  // `current.url` a crash. Clamping shows the last one instead. Prev / next
  // start from what is SHOWN, not from the stale remembered number. (-1 when
  // there are no photos: nothing is shown.)
  const shown = Math.min(index, images.length - 1)

  // Preload the NEIGHBOURS of the photo shown — the next and the previous
  // (the arrows wrap around) — so an arrow usually switches at once: the
  // browser keeps a downloaded image in its cache, and the <img> that asks
  // for the same URL next gets it from there. `new Image()` + `src` starts a
  // download without putting anything on the page. Only the neighbours, not
  // every photo: on a phone's data plan, downloading pictures nobody looks at
  // has a cost. Runs again whenever the photo shown (or the list) changes.
  useEffect(() => {
    if (images.length < 2) return
    const neighbours = new Set([
      (shown + 1) % images.length,
      (shown - 1 + images.length) % images.length,
    ])
    for (const position of neighbours) {
      const preload = new Image()
      preload.src = images[position].url
    }
  }, [shown, images])

  if (images.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  const current = images[shown]
  const currentStatus = status[current.url]

  function goToPrevious() {
    setIndex(shown === 0 ? images.length - 1 : shown - 1)
  }

  function goToNext() {
    setIndex(shown === images.length - 1 ? 0 : shown + 1)
  }

  function record(url: string, result: 'loaded' | 'error') {
    setStatus((before) => ({ ...before, [url]: result }))
  }

  return (
    <div className="space-y-2">
      {/* The frame has a fixed height (taller from the `sm` breakpoint) so
          the page doesn't jump when the next photo has another shape; the
          photo is drawn INSIDE it with `object-contain` — scaled to fit,
          whole, the space left over showing the muted background
          (letterboxing). `object-cover` filled the frame by cutting off what
          didn't fit: in a 160 px-high frame, most of a photo whose point is
          to show a movement. (Thumbnails elsewhere keep `object-cover` —
          there, equal squares matter more than the whole picture.) jsdom
          computes no layout, so this is checked in Chromium, not in a test. */}
      <div className="relative h-64 overflow-hidden rounded-lg border bg-muted sm:h-80">
        {/* key = the URL: another photo is a NEW <img> element, not the same
            one with its `src` changed. Changing `src` made Chrome keep
            painting the PREVIOUS photo until the new one had downloaded — the
            counter said "2 / 2" over photo 1, and a second click (back to
            photo 1) looked like the first had done nothing. A new element
            starts empty, so the frame says "Loading photo…" instead. Hidden
            (not removed) after an error, so its broken-image icon doesn't
            show behind the message. */}
        <img
          key={current.url}
          src={current.url}
          alt={`${exerciseName} photo ${shown + 1}`}
          className={`h-full w-full object-contain ${currentStatus === 'error' ? 'invisible' : ''}`}
          onLoad={() => record(current.url, 'loaded')}
          onError={() => record(current.url, 'error')}
        />
        {currentStatus !== 'loaded' && (
          <p className="absolute inset-0 flex items-center justify-center px-10 text-center text-sm text-muted-foreground">
            {currentStatus === 'error'
              ? "This photo couldn't be loaded."
              : 'Loading photo…'}
          </p>
        )}
        {/* The arrows are centred vertically WITHOUT a transform: `inset-y-0`
            (top: 0 and bottom: 0) with `my-auto` and a fixed height puts a
            28 px button in the middle of the frame. The usual
            `top-1/2 -translate-y-1/2` can't be used here: the shared Button
            nudges itself 1 px down while pressed (`active:translate-y-px`),
            and in Tailwind both write the SAME `translate` — so while the
            mouse was held down, the press REPLACED the -50% and the button
            jumped 15 px down, out from under the pointer. The release then
            landed on the photo, and the browser fires a click only when the
            press and the release are on the same element: pressed in the
            button's upper half, the click was lost (found by the person:
            "the arrow sometimes does nothing"; a console log showed the press
            on "Next photo", the release on the IMG). */}
        {images.length > 1 && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous photo"
              onClick={goToPrevious}
              className="absolute inset-y-0 left-1 my-auto h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next photo"
              onClick={goToNext}
              className="absolute inset-y-0 right-1 my-auto h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <p className="text-center text-xs text-muted-foreground">
          {shown + 1} / {images.length}
        </p>
      )}
    </div>
  )
}