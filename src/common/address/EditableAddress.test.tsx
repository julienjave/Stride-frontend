import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableAddress } from './EditableAddress'
import type { Address } from './types'

// country-state-city is a two-country fixture in tests (see
// src/test-setup.ts): United States (with states) and Aland Islands.
const fullAddress: Address = {
  addressLine1: '1 Main St',
  addressLine2: null,
  addressCity: 'Springfield',
  addressState: 'Illinois',
  addressPostalCode: '62704',
  addressCountry: 'US',
}

const emptyAddress: Address = {
  addressLine1: null,
  addressLine2: null,
  addressCity: null,
  addressState: null,
  addressPostalCode: null,
  addressCountry: null,
}

function renderAddress(address: Address = fullAddress) {
  const save = vi.fn().mockResolvedValue(undefined)
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <EditableAddress address={address} save={save} />
    </QueryClientProvider>,
  )
  return { save }
}

async function openEditor() {
  await userEvent.click(screen.getByRole('button', { name: 'Edit Address' }))
}

describe('EditableAddress — viewing', () => {
  it('shows the formatted address, country by name', () => {
    renderAddress()
    expect(screen.getByText('1 Main St')).toBeInTheDocument()
    expect(screen.getByText('62704 Springfield')).toBeInTheDocument()
    expect(screen.getByText('United States')).toBeInTheDocument()
  })

  it('shows "Not set" when there is no address', () => {
    renderAddress(emptyAddress)
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })
})

describe('EditableAddress — editing', () => {
  it('opens pre-filled, and saves ALL six fields — emptied ones as null', async () => {
    const { save } = renderAddress()
    await openEditor()
    expect(screen.getByLabelText('Address line 1')).toHaveValue('1 Main St')

    await userEvent.clear(screen.getByLabelText('Address line 1'))
    await userEvent.type(screen.getByLabelText('Address line 1'), '2 Oak Ave')
    await userEvent.type(screen.getByLabelText('Apartment, suite, etc. (optional)'), 'Apt 3')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    // Every call, with EVERY argument (toStrictEqual on mock.calls): one
    // call, given only the address — not TanStack Query's context object,
    // which a mutationFn receives as a second argument. And the WHOLE
    // object: all six keys must be present, so the address is replaced as
    // one unit.
    expect(save.mock.calls).toStrictEqual([
      [
        {
          addressLine1: '2 Oak Ave',
          addressLine2: 'Apt 3',
          addressCity: 'Springfield',
          addressState: 'Illinois',
          addressPostalCode: '62704',
          addressCountry: 'US',
        },
      ],
    ])
  })

  it('sends null (not "") for an optional part that was emptied', async () => {
    const { save } = renderAddress({ ...fullAddress, addressLine2: 'Apt 3' })
    await openEditor()
    await userEvent.clear(screen.getByLabelText('Apartment, suite, etc. (optional)'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save.mock.calls[0][0]).toEqual({ ...fullAddress, addressLine2: null })
  })

  it('refuses a half-filled address with the per-field messages, saving nothing', async () => {
    const { save } = renderAddress(emptyAddress)
    await openEditor()
    await userEvent.type(screen.getByLabelText('City'), 'Springfield')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Address line 1 is required')).toBeInTheDocument()
    expect(screen.getByText('Postal code is required')).toBeInTheDocument()
    expect(screen.getByText('Country is required')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('Remove address clears all six fields at once', async () => {
    const { save } = renderAddress()
    await openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Remove address' }))
    expect(save.mock.calls[0][0]).toEqual(emptyAddress)
  })

  it('offers no Remove button when there is no address to remove', async () => {
    renderAddress(emptyAddress)
    await openEditor()
    expect(screen.queryByRole('button', { name: 'Remove address' })).not.toBeInTheDocument()
  })

  it('Cancel closes the form without saving', async () => {
    const { save } = renderAddress()
    await openEditor()
    await userEvent.type(screen.getByLabelText('City'), 'ville')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('62704 Springfield')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })
})