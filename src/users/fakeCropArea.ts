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

import type { Area } from 'react-easy-crop'

// The area FakeCropper reports when a test "loads" the photo — distinctive
// numbers, so an assertion can tell it apart from anything else.
//
// In its own .ts file rather than exported from FakeCropper.tsx: the
// react-refresh lint rule wants a .tsx file to export only components (Vite's
// fast refresh can only hot-swap such files), and this is a plain value.
export const FAKE_CROP_AREA: Area = { x: 120, y: 40, width: 900, height: 900 }