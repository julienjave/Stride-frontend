import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { RouteErrorPage } from './RouteErrorPage'

// The app's shape in small: a root route with RouteErrorPage as its
// errorElement, and one lazy page whose "file" fails to load.
function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { path: '/', element: <p>Home</p> },
          {
            path: '/broken',
            lazy: () =>
              Promise.reject(new TypeError('Failed to fetch dynamically imported module')),
          },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

describe('RouteErrorPage', () => {
  afterEach(() => vi.restoreAllMocks())

  it("says a page couldn't be loaded, offers a reload, and logs the error for debugging", async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/broken')

    expect(
      await screen.findByRole('heading', { name: "This page couldn't be loaded" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
    // The failure itself reaches the console (React Router logs too: find
    // ours). WAITED for, like the heading: the page logs from a useEffect,
    // which React runs AFTER the render that shows the heading has been
    // committed — so the heading can be on screen a moment before the log
    // is written. Checked at once, the assertion lost that race now and
    // then on a busy machine (found in a full parallel run: reproduced 2
    // times in 12 under load; 0 in 12 with the wait).
    await vi.waitFor(() =>
      expect(logged).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Failed to fetch dynamically imported module' }),
      ),
    )
  })

  it("says an unknown address doesn't exist — with no reload button, and nothing logged as an error", async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/no-such-page')

    expect(
      await screen.findByRole('heading', { name: "This page doesn't exist" }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reload the page' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
    // React Router may warn about the unmatched path itself; what matters is
    // that the page didn't log the 404 response as an error of its own.
    expect(logged).not.toHaveBeenCalledWith(expect.objectContaining({ status: 404 }))
  })
})