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

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './button'

// shadcn's generated component, changed in one place (design decisions §39):
// the default button's hover. paletteContrast.test.ts proves the
// --primary-hover token keeps white text readable; this proves the button
// actually USES it — jsdom can't hover or paint, so the class is the
// contract to check.
describe('Button', () => {
  it('hovers to the --primary-hover token, not a lighter, see-through primary', () => {
    render(<Button>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveClass('bg-primary', 'text-primary-foreground', 'hover:bg-primary-hover')
    expect(button.className).not.toMatch(/hover:bg-primary\/\d+/)
  })
})
