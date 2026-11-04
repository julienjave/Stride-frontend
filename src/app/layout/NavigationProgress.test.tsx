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

import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, Outlet, createMemoryRouter, RouterProvider } from 'react-router'
import { NavigationProgress } from './NavigationProgress'

// A lazy route whose "file" arrives only when the test says so — the
// situation the indicator is for: a page's code still downloading.
function renderWithSlowPage() {
  let finishLoading: () => void = () => {}
  const loaded = new Promise<void>((resolve) => {
    finishLoading = resolve
  })
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <>
          <NavigationProgress />
          <Link to="/next">Next page</Link>
        </>
      ),
    },
    {
      path: '/next',
      lazy: async () => {
        await loaded
        return { Component: () => <h1>Next page loaded</h1> }
      },
    },
  ])
  render(<RouterProvider router={router} />)
  return { finishLoading, loaded }
}

describe('NavigationProgress', () => {
  it('shows nothing, with an empty status, while no page is loading', () => {
    renderWithSlowPage()
    expect(screen.queryByTestId('navigation-progress')).not.toBeInTheDocument()
    // The status region is there BEFORE anything happens — screen readers
    // announce a change in an existing region reliably.
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it("shows the bar and says so while the next page's file loads, then clears", async () => {
    const { finishLoading, loaded } = renderWithSlowPage()
    await userEvent.click(screen.getByRole('link', { name: 'Next page' }))

    // Still on the old page, with the indicator.
    expect(screen.getByTestId('navigation-progress')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading page…')

    // Release the page's file, and let React render what follows.
    await act(async () => {
      finishLoading()
      await loaded
    })
    expect(await screen.findByRole('heading', { name: 'Next page loaded' })).toBeInTheDocument()
  })

  it('clears once the page has arrived (the layout stays on screen in the app)', async () => {
    // In the app the indicator lives in the layout, which stays mounted
    // while pages change: here it sits in a layout route around both pages.
    let finishLoading: () => void = () => {}
    const loaded = new Promise<void>((resolve) => {
      finishLoading = resolve
    })
    const router = createMemoryRouter([
      {
        element: (
          <>
            <NavigationProgress />
            <Outlet />
          </>
        ),
        children: [
          { path: '/', element: <Link to="/next">Next page</Link> },
          {
            path: '/next',
            lazy: async () => {
              await loaded
              return { Component: () => <h1>Next page loaded</h1> }
            },
          },
        ],
      },
    ])
    render(<RouterProvider router={router} />)
    await userEvent.click(screen.getByRole('link', { name: 'Next page' }))
    expect(screen.getByRole('status')).toHaveTextContent('Loading page…')

    // Release the page's file, and let React render what follows.
    await act(async () => {
      finishLoading()
      await loaded
    })
    expect(router.state.location.pathname).toBe('/next')
    expect(screen.queryByTestId('navigation-progress')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})