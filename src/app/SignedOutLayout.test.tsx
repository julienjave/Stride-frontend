import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { SignedOutLayout } from './SignedOutLayout'

// The layout as routes.tsx uses it: a pathless parent, the page as its child.
function renderWithPage() {
  const router = createMemoryRouter(
    [{ element: <SignedOutLayout />, children: [{ path: '/login', element: <h1>Log in</h1> }] }],
    { initialEntries: ['/login'] },
  )
  render(<RouterProvider router={router} />)
}

describe('SignedOutLayout', () => {
  it('draws the Stride logo, named, above the page', () => {
    renderWithPage()
    const [logo] = screen.getAllByRole('img', { name: 'Stride' })
    const heading = screen.getByRole('heading', { name: 'Log in' })
    // compareDocumentPosition: FOLLOWING = the heading comes after the logo
    // in the page — what a screen reader (and the eye) meets first.
    expect(logo.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('draws the larger size, not the top bar’s', () => {
    renderWithPage()
    for (const image of screen.getAllByRole('img', { name: 'Stride' })) {
      expect(image).toHaveClass('h-12')
      expect(image).not.toHaveClass('h-7')
    }
  })

  it('is not a link — on these pages there is no "home" to go to', () => {
    renderWithPage()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})