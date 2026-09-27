import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvatarCropDialog } from './AvatarCropDialog'
import { FAKE_CROP_AREA } from './fakeCropArea'

// jsdom can't run the real cropper (see FakeCropper.tsx for why).
vi.mock('react-easy-crop', () => import('./FakeCropper'))

const PHOTO_URL = 'blob:picked-photo'

function renderDialog(imageUrl: string | null = PHOTO_URL) {
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  const view = render(
    <AvatarCropDialog imageUrl={imageUrl} onCancel={onCancel} onConfirm={onConfirm} />,
  )
  return { onCancel, onConfirm, rerender: view.rerender }
}

function zoomSlider() {
  return screen.getByRole('slider', { name: 'Zoom' })
}

// The <img> inside the (fake) cropper — its src is the photo shown.
function croppedPhoto() {
  return screen.getByRole('dialog').querySelector('img')
}

describe('AvatarCropDialog — opening', () => {
  it('is closed when there is no photo to crop', () => {
    renderDialog(null)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens on the picked photo, with a labelled crop frame', () => {
    renderDialog()
    expect(screen.getByRole('dialog', { name: 'Crop your photo' })).toBeInTheDocument()
    expect(croppedPhoto()).toHaveAttribute('src', PHOTO_URL)
    // Our cropperProps reached the library's focusable crop frame.
    expect(
      screen.getByRole('group', {
        name: 'Photo position. Use the arrow keys to move the photo.',
      }),
    ).toBeInTheDocument()
  })

  it('moves the photo 10 screen pixels per arrow-key press (the library default is 1)', () => {
    renderDialog()
    expect(screen.getByTestId('crop-frame')).toHaveAttribute('data-keyboard-step', '10')
  })
})

describe('AvatarCropDialog — saving', () => {
  it('keeps "Save photo" disabled until the crop area is known', () => {
    renderDialog()
    // The real library reports the area only once the photo has loaded.
    expect(screen.getByRole('button', { name: 'Save photo' })).toBeDisabled()
  })

  it('reports the chosen area, in the photo’s pixels, on Save', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Simulate photo loaded' }))
    await user.click(screen.getByRole('button', { name: 'Save photo' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledWith(FAKE_CROP_AREA)
    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('AvatarCropDialog — zoom', () => {
  it('has a zoom slider from 1 to 3, starting at 1 (read out as 100%)', () => {
    renderDialog()
    expect(zoomSlider()).toHaveValue('1')
    expect(zoomSlider()).toHaveAttribute('min', '1')
    expect(zoomSlider()).toHaveAttribute('max', '3')
    expect(zoomSlider()).toHaveAttribute('step', '0.1')
    expect(zoomSlider()).toHaveAttribute('aria-valuetext', '100%')
    expect(screen.getByTestId('crop-frame')).toHaveAttribute('data-zoom', '1')
  })

  it('moving the slider zooms the cropper', () => {
    renderDialog()
    // fireEvent.change, not userEvent: jsdom doesn't implement a range
    // input's arrow-key behaviour (real browsers do — manual checklist).
    fireEvent.change(zoomSlider(), { target: { value: '1.5' } })

    expect(screen.getByTestId('crop-frame')).toHaveAttribute('data-zoom', '1.5')
    expect(zoomSlider()).toHaveAttribute('aria-valuetext', '150%')
  })

  it("zooming in the cropper (mouse wheel, pinch) moves the slider too", async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Simulate wheel zoom' }))

    expect(zoomSlider()).toHaveValue('2')
    expect(screen.getByTestId('crop-frame')).toHaveAttribute('data-zoom', '2')
  })
})

describe('AvatarCropDialog — cancelling', () => {
  it('Cancel reports a cancel, not a save', async () => {
    const user = userEvent.setup()
    const { onCancel, onConfirm } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Simulate photo loaded' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Escape cancels too', async () => {
    const user = userEvent.setup()
    const { onCancel } = renderDialog()

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('AvatarCropDialog — measuring after the opening animation', () => {
  // The real bug: the cropper measured itself while the dialog was still
  // scaled down by its zoom-in animation, so the circle came out smaller
  // than the photo. jsdom runs no animations, so the end of one is
  // simulated.
  //
  // Not with fireEvent.animationEnd, though — confirmed to do nothing here.
  // React picks which DOM event feeds onAnimationEnd when it loads: in a
  // browser (which has AnimationEvent) it's "animationend"; jsdom has no
  // AnimationEvent, so React falls back to the old prefixed name
  // "webkitAnimationEnd". Firing THAT name is what reaches our handler.
  function endAnimation(element: Element) {
    fireEvent(element, new Event('webkitAnimationEnd', { bubbles: true }))
  }

  it('remounts the cropper when the dialog finishes opening, keeping the zoom', () => {
    renderDialog()
    fireEvent.change(zoomSlider(), { target: { value: '2' } })
    const mountBefore = screen.getByTestId('crop-frame').getAttribute('data-mount')

    endAnimation(screen.getByRole('dialog'))

    const frame = screen.getByTestId('crop-frame')
    expect(frame.getAttribute('data-mount')).not.toBe(mountBefore)
    // Our state survived: the new cropper gets the same zoom.
    expect(frame).toHaveAttribute('data-zoom', '2')
    expect(zoomSlider()).toHaveValue('2')
  })

  it("ignores animations of elements INSIDE the dialog (animationend bubbles)", () => {
    renderDialog()
    const mountBefore = screen.getByTestId('crop-frame').getAttribute('data-mount')

    endAnimation(screen.getByTestId('crop-frame'))

    expect(screen.getByTestId('crop-frame')).toHaveAttribute('data-mount', mountBefore)
  })
})

describe('AvatarCropDialog — a photo the browser cannot open', () => {
  it('says so, and disables Save and the zoom', async () => {
    const user = userEvent.setup()
    renderDialog()
    // Even if an area had arrived first, a broken photo can't be saved.
    await user.click(screen.getByRole('button', { name: 'Simulate photo loaded' }))

    fireEvent.error(croppedPhoto()!)

    expect(screen.getByRole('alert')).toHaveTextContent(
      "This image couldn't be opened. Try a JPEG, PNG or WebP photo.",
    )
    expect(screen.getByRole('button', { name: 'Save photo' })).toBeDisabled()
    expect(zoomSlider()).toBeDisabled()
    // Cancel still works — the only way forward is another photo.
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
  })
})

describe('AvatarCropDialog — each photo starts fresh', () => {
  it('a second photo opens at zoom 1, with no area carried over', async () => {
    const user = userEvent.setup()
    const { rerender } = renderDialog('blob:first')
    const noop = () => {}

    await user.click(screen.getByRole('button', { name: 'Simulate photo loaded' }))
    fireEvent.change(zoomSlider(), { target: { value: '2.5' } })

    // Closed (the parent clears the URL), then opened on another photo.
    rerender(<AvatarCropDialog imageUrl={null} onCancel={noop} onConfirm={noop} />)
    rerender(<AvatarCropDialog imageUrl="blob:second" onCancel={noop} onConfirm={noop} />)

    expect(croppedPhoto()).toHaveAttribute('src', 'blob:second')
    expect(zoomSlider()).toHaveValue('1')
    expect(screen.getByRole('button', { name: 'Save photo' })).toBeDisabled()
  })
})