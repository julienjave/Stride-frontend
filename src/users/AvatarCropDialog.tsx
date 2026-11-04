/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { useId, useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

// Zoom 1 = the whole short side of the photo fits the circle (the library
// never lets the photo be smaller than the circle). 3 = a third of that.
export const MIN_ZOOM = 1
export const MAX_ZOOM = 3
// One arrow-key press on the slider. 0.1 means 20 presses from 1 to 3.
export const ZOOM_STEP = 0.1
// How far one arrow-key press moves the photo in the crop frame, in screen
// pixels. The library's default is 1, which was measured in a real browser
// to need hundreds of presses to cross a photo; 10 is quick, and the
// library still gives fine 2px steps with Shift held.
export const KEYBOARD_STEP_PX = 10

interface AvatarCropDialogProps {
  // The picked photo as a local "blob:" URL, or null when no photo is being
  // cropped. The dialog is open exactly when this is set — the parent
  // (AvatarUpload) owns "is a crop in progress", the dialog just shows it.
  imageUrl: string | null
  // Cancel, Escape, the X button, or a click outside.
  onCancel: () => void
  // "Save photo": the chosen square, in the photo's own pixels.
  onConfirm: (area: Area) => void
}

// The crop step between picking a photo and uploading it. It only CHOOSES
// the square; it doesn't draw or upload anything. The parent does that with
// the area this reports — which keeps this component free of canvas code
// (untestable in jsdom) and of API calls.
export function AvatarCropDialog({ imageUrl, onCancel, onConfirm }: AvatarCropDialogProps) {
  // Bumped when the dialog's opening animation ends, to make the cropper
  // measure itself again (see onAnimationEnd below).
  const [measureKey, setMeasureKey] = useState(0)

  return (
    // A CONTROLLED dialog: `open` comes from props. Radix calls
    // onOpenChange(false) for every way of dismissing it (Escape, X, click
    // outside, a DialogClose button), so all of them become one onCancel.
    // Save doesn't go through here: it calls onConfirm, and the parent
    // closes the dialog by clearing imageUrl.
    <Dialog
      open={imageUrl !== null}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent
        // WHY: the dialog opens with a short zoom-in animation — a CSS
        // transform from 95% to 100% scale over 100ms. react-easy-crop sizes
        // its circle from getBoundingClientRect(), which INCLUDES transforms,
        // and it measures once, when the photo has loaded. A photo that loads
        // mid-animation was measured up to 5% too small, leaving a gap
        // between the circle and the photo's edges that the circle could
        // never cross (found in manual testing, then measured in Chromium:
        // 7–13px, varying with timing). Its ResizeObserver doesn't help: a
        // transform isn't a resize.
        //
        // The fix: once the animation is over, remount the cropper so it
        // measures at full size. Remounting loses nothing — its position and
        // zoom are OUR state (it's controlled), so the fresh one picks them
        // up again.
        //
        // animationend BUBBLES: an animation on any element inside the dialog
        // would reach here too. Only the dialog's own animation counts,
        // hence the target check. If there's no animation at all (e.g. the
        // OS "reduce motion" setting), this never fires — and then there was
        // no transform to mis-measure in the first place.
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setMeasureKey((key) => key + 1)
        }}
      >
        <DialogHeader>
          <DialogTitle>Crop your photo</DialogTitle>
          <DialogDescription>
            Drag the photo or use the arrow keys to position it, and the slider to zoom. Only the
            part inside the circle is kept.
          </DialogDescription>
        </DialogHeader>

        {/* The editor is its own component so that its state (position,
            zoom, chosen area) is created fresh for every photo: when the
            dialog closes, Radix removes this content from the page, the
            editor unmounts, and its state is thrown away. Kept up here in
            AvatarCropDialog instead, the state would survive between
            photos — the second photo would open at the first one's zoom. */}
        {imageUrl && (
          <CropEditor imageUrl={imageUrl} measureKey={measureKey} onConfirm={onConfirm} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CropEditor({
  imageUrl,
  measureKey,
  onConfirm,
}: {
  imageUrl: string
  // Changing it remounts the cropper, which makes it measure itself again.
  measureKey: number
  onConfirm: (area: Area) => void
}) {
  // react-easy-crop is a CONTROLLED component too: it reports drags and
  // zooms through onCropChange/onZoomChange and displays whatever we pass
  // back. Owning `zoom` here is what lets our slider and the library's own
  // mouse-wheel/pinch zoom stay in sync — both write the same state.
  //
  // `crop` is the photo's offset from centered, in SCREEN pixels — only
  // meaningful to the library, so we just hand it back.
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(MIN_ZOOM)
  // What we actually need: the chosen square in the PHOTO's pixels.
  // The library computes it once the photo has loaded and after each
  // drag/zoom ends (onCropComplete). Null until then, so Save waits for it.
  const [area, setArea] = useState<Area | null>(null)
  // The browser couldn't decode the photo: a mislabeled file, or a format
  // this browser can't read (e.g. an iPhone HEIC photo renamed to .jpg).
  // The type check before the dialog only looks at what the file CLAIMS.
  const [loadFailed, setLoadFailed] = useState(false)

  // useId() makes an id unique on the page, to tie the <label> to the
  // slider (htmlFor → id) without two dialogs ever clashing.
  const zoomInputId = useId()

  return (
    <>
      {/* The library positions itself absolutely inside its parent, so the
          parent must be `relative` and have a height. */}
      <div className="relative h-72 w-full overflow-hidden rounded-md bg-muted">
        {loadFailed ? (
          <p role="alert" className="p-4 text-sm text-destructive">
            This image couldn't be opened. Try a JPEG, PNG or WebP photo.
          </p>
        ) : (
          <Cropper
            // A new key = React throws the old cropper away and mounts a new
            // one (see the dialog's onAnimationEnd for why).
            key={measureKey}
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            // A square…
            aspect={1}
            // …shown as a circle, the way avatars are displayed. Only the
            // look changes: the area is still the full square, and the
            // corners are hidden by the round avatar anyway.
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            keyboardStep={KEYBOARD_STEP_PX}
            // (percentages, pixels) — we only need the pixels.
            onCropComplete={(_areaPercentages, areaPixels) => setArea(areaPixels)}
            // Extra attributes for the library's crop frame, the element
            // that takes keyboard focus and moves the photo with the arrow
            // keys. Without a role and a name, a screen reader would reach
            // an unnamed, meaningless focus stop.
            cropperProps={{
              role: 'group',
              'aria-label': 'Photo position. Use the arrow keys to move the photo.',
            }}
            // Passed onto the library's <img>: its error event is how we
            // learn the browser couldn't decode the photo.
            mediaProps={{ onError: () => setLoadFailed(true) }}
          />
        )}
      </div>

      {/* Our own zoom control. The library only zooms with the mouse wheel
          or a pinch; a native range input adds keyboard zoom (arrow keys,
          Home/End) and is announced by screen readers as a slider, with no
          extra code. */}
      <div className="space-y-2">
        <Label htmlFor={zoomInputId}>Zoom</Label>
        <input
          id={zoomInputId}
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          value={zoom}
          // A range input's value is always a string — convert it back.
          onChange={(event) => setZoom(Number(event.target.value))}
          // Read out as "150%" rather than "1.5".
          aria-valuetext={`${Math.round(zoom * 100)}%`}
          disabled={loadFailed}
          // accent-color: the browser's own slider, in our theme's color.
          className="w-full accent-primary"
        />
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="button"
          disabled={area === null || loadFailed}
          onClick={() => {
            if (area) onConfirm(area)
          }}
        >
          Save photo
        </Button>
      </DialogFooter>
    </>
  )
}