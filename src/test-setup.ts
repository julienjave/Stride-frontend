import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
// This import has a side effect: it extends Vitest's `expect` with
// jest-dom's matchers (toBeInTheDocument, toHaveTextContent, etc.) — an
// extension, not something Vitest ships with by default.
import '@testing-library/jest-dom/vitest'

// Without this, every render() in a test file mounts INTO THE SAME jsdom
// document, and never gets removed — so test 2 in a file sees test 1's
// leftover DOM still sitting there, and things like getByRole start
// matching multiple elements that all look identical (confirmed: this is
// exactly the "Found multiple elements with role button" failure above).
// afterEach here runs automatically, for every test in every file, without
// each test file needing to remember to do it individually.
afterEach(() => {
  cleanup()
})

// jsdom (the in-memory fake browser these tests run against) does not
// implement URL.createObjectURL or URL.revokeObjectURL at all — confirmed
// directly, not assumed: calling either throws "is not a function" in a
// fresh jsdom environment. Every real browser has both. Rather than
// leaving each test file that touches an object-URL-using component (like
// ClinicLogoUpload) to work around this individually, they're stubbed
// once here so every test gets a usable, fake implementation: a
// predictable string in, a no-op for the revoke.
URL.createObjectURL = vi.fn(() => 'blob:mock-object-url')
URL.revokeObjectURL = vi.fn()

// jsdom also doesn't implement a few pointer/scroll APIs that Radix UI's
// interactive primitives (Select now; any future Dropdown, Popover, or
// similar) call internally — confirmed directly: clicking a Radix Select
// trigger throws "target.hasPointerCapture is not a function" without
// this, before the click even finishes. Real browsers have all three;
// jsdom just never implemented the pointer-capture APIs, and its
// scrollIntoView is a no-op stub rather than missing outright, EXCEPT it
// still needs a body here because jsdom's default throws "not
// implemented" the same way createObjectURL did above.
Element.prototype.hasPointerCapture = vi.fn(() => false)
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()
Element.prototype.scrollIntoView = vi.fn()