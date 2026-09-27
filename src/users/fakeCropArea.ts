import type { Area } from 'react-easy-crop'

// The area FakeCropper reports when a test "loads" the photo — distinctive
// numbers, so an assertion can tell it apart from anything else.
//
// In its own .ts file rather than exported from FakeCropper.tsx: the
// react-refresh lint rule wants a .tsx file to export only components (Vite's
// fast refresh can only hot-swap such files), and this is a plain value.
export const FAKE_CROP_AREA: Area = { x: 120, y: 40, width: 900, height: 900 }