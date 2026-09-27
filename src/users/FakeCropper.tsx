import { useState } from 'react'
import type { CropperProps } from 'react-easy-crop'
import { FAKE_CROP_AREA } from './fakeCropArea'

// A stand-in for react-easy-crop's <Cropper>, for tests only. Used with
//   vi.mock('react-easy-crop', () => import('./FakeCropper'))
// which makes every `import Cropper from 'react-easy-crop'` in the code
// under test receive this component instead.
//
// Why fake it: the real Cropper only computes the crop area once its <img>
// has LOADED and it has measured it on screen. jsdom never loads images and
// lays nothing out (every size is 0), so with the real one the area would
// never arrive and "Save photo" could never be tested. The fake keeps the
// same props, and turns the library's callbacks into buttons a test can
// click. What the real library does with the mouse and keyboard is its own
// (tested) business; what we check is how OUR code reacts to it.

// Every mount of a FakeCropper takes the next number, and shows it as
// data-mount — so a test can see that the cropper was REMOUNTED (a new
// number) rather than just re-rendered (same number).
let mountCount = 0

type FakeCropperProps = Pick<
  CropperProps,
  | 'image'
  | 'zoom'
  | 'keyboardStep'
  | 'onZoomChange'
  | 'onCropComplete'
  | 'cropperProps'
  | 'mediaProps'
>

export default function FakeCropper({
  image,
  zoom,
  keyboardStep,
  onZoomChange,
  onCropComplete,
  cropperProps,
  mediaProps,
}: FakeCropperProps) {
  // A useState initializer runs once per mount — exactly "count mounts".
  const [mountNumber] = useState(() => ++mountCount)

  return (
    <div>
      {/* Like the real one: our mediaProps (the onError handler) land on
          the <img>, so fireEvent.error(img) simulates an undecodable file. */}
      <img alt="" {...mediaProps} src={image} />
      {/* Like the real crop frame: receives our cropperProps (role, label),
          and exposes the zoom and arrow-key step it was given for
          assertions. */}
      <div
        data-testid="crop-frame"
        data-zoom={zoom}
        data-keyboard-step={keyboardStep}
        data-mount={mountNumber}
        {...cropperProps}
      />
      <button
        type="button"
        onClick={() => onCropComplete?.({ x: 0, y: 0, width: 100, height: 100 }, FAKE_CROP_AREA)}
      >
        Simulate photo loaded
      </button>
      <button type="button" onClick={() => onZoomChange?.(2)}>
        Simulate wheel zoom
      </button>
    </div>
  )
}