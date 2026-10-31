import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { RouteErrorPage } from './RouteErrorPage'

// Error reporting, observed: whether it's on, and what the page reports.
// (The reporter itself is tested in observability/errorReporting.test.ts.)
const reporting = vi.hoisted(() => ({ on: true, report: vi.fn() }))
vi.mock('@/observability/errorReporting', () => ({
  isErrorReportingOn: () => reporting.on,
  reportError: reporting.report,
}))
// A known reference instead of a random one.
vi.mock('@/observability/reportRules', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/observability/reportRules')>()),
  newReference: () => '7f3a1c2e',
}))

function Crashing(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'id')")
}

// The app's shape in small: a root route with RouteErrorPage as its
// errorElement, one lazy page whose "file" fails to load, and one page that
// crashes while rendering.
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
          { path: '/crashing', element: <Crashing /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

describe('RouteErrorPage', () => {
  beforeEach(() => {
    reporting.on = true
    reporting.report.mockReset()
  })
  afterEach(() => vi.restoreAllMocks())

  it("says a page couldn't be loaded, offers a reload, and logs the error for debugging", async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/broken')

    expect(
      await screen.findByRole('heading', { name: "This page couldn't be loaded" }),
    ).toBeInTheDocument()
    // The reader's side, or an update: the connection, then a reload.
    expect(
      screen.getByText(
        'Check your connection, then reload. If Stride was just updated, reloading gets you the new version.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/problem on our side/)).not.toBeInTheDocument()
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
    expect(reporting.report).not.toHaveBeenCalled()
  })

  // A page that CRASHED is a bug: its own words (our side — never "check
  // your connection", which would send the reader looking for a problem
  // they don't have), reported, with a reference on screen that finds the
  // report (decisions §32, pass 3).
  it('says a crash is on our side, reports it, and shows its reference', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/crashing')

    expect(
      await screen.findByRole('heading', { name: 'Something went wrong on this page' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'This is a problem on our side, not with your connection. Reloading the page may get past it.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Check your connection/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload the page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/')
    expect(screen.getByText('Reference: 7f3a1c2e.')).toBeInTheDocument()
    await vi.waitFor(() => expect(reporting.report).toHaveBeenCalled())
    expect(reporting.report).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Cannot read properties of undefined (reading 'id')" }),
      { where: 'route-error', reference: '7f3a1c2e' },
    )
  })

  // The button reloads the whole page (both wordings share it). jsdom can't
  // navigate, so `location` is replaced for this test.
  it('reloads the page when asked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    try {
      renderAt('/crashing')
      await userEvent.click(await screen.findByRole('button', { name: 'Reload the page' }))
      expect(reload).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  // Not a bug of the page: the connection, or a new version deployed.
  it("doesn't report a page file that couldn't be downloaded, nor show a reference", async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/broken')
    await screen.findByRole('heading', { name: "This page couldn't be loaded" })
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument()
    // The page has logged by now (its effect ran): reporting would have too.
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(reporting.report).not.toHaveBeenCalled()
  })

  // A reference that leads nowhere would only mislead.
  it('shows no reference when reporting is off', async () => {
    reporting.on = false
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderAt('/crashing')
    // Still a crash, in its own words — only the reference goes.
    await screen.findByRole('heading', { name: 'Something went wrong on this page' })
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument()
    await vi.waitFor(() => expect(console.error).toHaveBeenCalled())
    expect(reporting.report).not.toHaveBeenCalled()
  })
})