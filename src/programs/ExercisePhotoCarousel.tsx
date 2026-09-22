import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExerciseImage } from '@/exercises/types'

interface ExercisePhotoCarouselProps {
  images: ExerciseImage[]
  exerciseName: string
}

// View-only — deliberately not the reorderable, deletable gallery
// ExercisePhotosPage already has. That screen owns managing an
// exercise's photos; this one is just showing them for reference while
// picking sets/reps/weight, so a much simpler one-at-a-time carousel is
// all this needs.
export function ExercisePhotoCarousel({
  images,
  exerciseName,
}: ExercisePhotoCarouselProps) {
  const [index, setIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        No photos yet.
      </div>
    )
  }

  const current = images[index]

  function goToPrevious() {
    setIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  }

  function goToNext() {
    setIndex((i) => (i === images.length - 1 ? 0 : i + 1))
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <img
          src={current.url}
          alt={`${exerciseName} photo ${index + 1}`}
          className="h-40 w-full rounded-lg object-cover"
        />
        {images.length > 1 && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous photo"
              onClick={goToPrevious}
              className="absolute left-1 top-1/2 h-7 w-7 -translate-y-1/2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next photo"
              onClick={goToNext}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <p className="text-center text-xs text-muted-foreground">
          {index + 1} / {images.length}
        </p>
      )}
    </div>
  )
}