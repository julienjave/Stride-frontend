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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RoleSwitcher } from './RoleSwitcher'
import { currentUserQueryKey } from './useCurrentUser'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// RoleSwitcher renders MENU ITEMS, which only work inside a menu. `open`
// forces the menu open from the start, so each test looks at the items
// directly.
//
// A WARNING about that shortcut, learned the hard way: a forced-open menu
// never closes, so nothing inside it is ever unmounted. That's exactly the
// condition under which the old RoleSwitcher's redirect "worked" in tests
// while silently failing in the real app (where choosing an item closes
// the menu and unmounts this component). So this file only tests what
// RoleSwitcher itself does — which roles it lists, and what it REPORTS.
// The real switch (request, header update, redirect) is tested through
// the real, closing menu in UserMenu.test.tsx.
function renderSwitcher(
  user: { activeRole: string; roles: string[] },
  { isSwitching = false } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, user)
  // vi.fn() records every call, so a test can assert on exactly what
  // RoleSwitcher reported, and how many times.
  const onSwitch = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <DropdownMenu open>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <RoleSwitcher onSwitch={onSwitch} isSwitching={isSwitching} />
        </DropdownMenuContent>
      </DropdownMenu>
    </QueryClientProvider>,
  )
  return { onSwitch }
}

function roleOptions() {
  return screen
    .getAllByRole('menuitemradio')
    .map((item) => [item.textContent, item.getAttribute('aria-checked')])
}

const multiRole = { activeRole: 'practitioner', roles: ['practitioner', 'admin'] }

describe('RoleSwitcher', () => {
  it('renders nothing for a single-role account — not even its heading', () => {
    renderSwitcher({ activeRole: 'patient', roles: ['patient'] })
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument()
    expect(screen.queryByText('Switch role')).not.toBeInTheDocument()
  })

  it('lists every held role in a fixed order, with the active one ticked', () => {
    // Deliberately out of order in the input: the output should still be
    // admin → practitioner → patient, however the backend orders them.
    renderSwitcher(multiRole)
    expect(screen.getByText('Switch role')).toBeInTheDocument()
    expect(roleOptions()).toEqual([
      ['Admin', 'false'],
      ['Practitioner', 'true'],
    ])
  })

  it('reports the chosen role, once', async () => {
    const { onSwitch } = renderSwitcher(multiRole)
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'Admin' }))
    expect(onSwitch).toHaveBeenCalledTimes(1)
    expect(onSwitch).toHaveBeenCalledWith('admin')
  })

  it('reports nothing when the already-active role is chosen', async () => {
    const { onSwitch } = renderSwitcher(multiRole)
    await userEvent.click(
      screen.getByRole('menuitemradio', { name: 'Practitioner' }),
    )
    expect(onSwitch).not.toHaveBeenCalled()
  })

  it('disables every role while a switch is in flight', () => {
    renderSwitcher(multiRole, { isSwitching: true })
    // Radix marks a disabled item with aria-disabled (and data-disabled),
    // which is what makes it unselectable and announced as unavailable.
    for (const item of screen.getAllByRole('menuitemradio')) {
      expect(item).toHaveAttribute('aria-disabled', 'true')
    }
  })
})