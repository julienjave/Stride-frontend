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
