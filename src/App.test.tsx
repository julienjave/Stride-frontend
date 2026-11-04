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

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { READABLE_FONT_CLASS } from '@/theme/font'
import App from './App'

// App's real router would load every page; a one-page stand-in is enough
// for what is checked here — what App itself does around the router.
// Everything the stand-in needs is imported INSIDE the factory: vi.mock is
// hoisted above the file's imports, so it can't use them (JSX included —
// it compiles to an imported function).
vi.mock('@/app/routes', async () => {
  const { createMemoryRouter } = await import('react-router')
  const { createElement } = await import('react')
  return {
    router: createMemoryRouter([{ path: '*', element: createElement('p', null, 'A page') }]),
  }
})

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

function renderApp() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  // Decisions §39, pass 3: the font follows the account on EVERY page, so
  // App — above the router — applies it once the bootstrap knows who is in.
  it("applies the signed-in account's font setting", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 7, activeRole: 'patient', roles: ['patient'], readableFont: true })),
    )
    renderApp()
    expect(await screen.findByText('A page')).toBeInTheDocument()
    await waitFor(() => expect(document.documentElement).toHaveClass(READABLE_FONT_CLASS))
  })
})