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
import { z } from 'zod'
import { EditableField, ReadOnlyField } from './EditableField'
import { ApiError } from '@/api/client'

// Two schemas standing for the two kinds of field: one that can be
// cleared (accepts ''), one that can't.
const optionalSchema = z.string().max(10, 'Too long')
const requiredSchema = z.string().min(1, 'Name is required')

function renderField(props: Partial<Parameters<typeof EditableField>[0]> = {}) {
  // vi.fn() records every call; mockResolvedValue makes it behave like a
  // successful save.
  const save = vi.fn().mockResolvedValue(undefined)
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <EditableField label="Phone" value="555-0100" schema={optionalSchema} save={save} {...props} />
    </QueryClientProvider>,
  )
  return { save }
}

async function openEditor(label = 'Phone') {
  await userEvent.click(screen.getByRole('button', { name: `Edit ${label}` }))
}

describe('EditableField — viewing', () => {
  it('shows the label and value, with an Edit button named after the field', () => {
    renderField()
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('555-0100')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Phone' })).toBeInTheDocument()
  })

  it('shows "Not set" for a null value', () => {
    renderField({ value: null })
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('uses formatValue for display only', () => {
    renderField({ value: 'raw', formatValue: (v) => `formatted ${v}` })
    expect(screen.getByText('formatted raw')).toBeInTheDocument()
  })

  it('with a readOnlyNote: no Edit button, and the note explains why', () => {
    renderField({ readOnlyNote: 'Only an admin can change this.' })
    expect(screen.queryByRole('button', { name: 'Edit Phone' })).not.toBeInTheDocument()
    expect(screen.getByText('Only an admin can change this.')).toBeInTheDocument()
  })
})

describe('EditableField — editing', () => {
  it('opens pre-filled with the current value, and saves the new one', async () => {
    const { save } = renderField()
    await openEditor()
    const input = screen.getByLabelText('Phone')
    expect(input).toHaveValue('555-0100')

    await userEvent.clear(input)
    await userEvent.type(input, '555-9999')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(save).toHaveBeenCalledTimes(1)
    // The first argument of the first call.
    expect(save.mock.calls[0][0]).toBe('555-9999')
    // Back to the view: the editor closed after the save succeeded.
    expect(await screen.findByRole('button', { name: 'Edit Phone' })).toBeInTheDocument()
  })

  it('saves on Enter too, and trims surrounding spaces', async () => {
    const { save } = renderField()
    await openEditor()
    const input = screen.getByLabelText('Phone')
    await userEvent.clear(input)
    await userEvent.type(input, '  555-1111  {Enter}')
    expect(save.mock.calls[0][0]).toBe('555-1111')
  })

  it('saves an emptied CLEARABLE field as null — not as an empty string', async () => {
    const { save } = renderField()
    await openEditor()
    await userEvent.clear(screen.getByLabelText('Phone'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save.mock.calls[0][0]).toBeNull()
  })

  it('refuses to empty a REQUIRED field: shows the message, saves nothing', async () => {
    const { save } = renderField({ label: 'First name', value: 'Jane', schema: requiredSchema })
    await openEditor('First name')
    await userEvent.clear(screen.getByLabelText('First name'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toHaveAttribute('aria-invalid', 'true')
    expect(save).not.toHaveBeenCalled()
  })

  it('shows the schema message for an invalid value, and saves nothing', async () => {
    const { save } = renderField()
    await openEditor()
    await userEvent.type(screen.getByLabelText('Phone'), '-far-too-long')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Too long')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('closes without a request when nothing changed', async () => {
    const { save } = renderField()
    await openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit Phone' })).toBeInTheDocument()
  })

  it('stays open and shows the server message when the save fails', async () => {
    const save = vi.fn().mockRejectedValue(
      new ApiError({
        statusCode: 409,
        message: ['This license number is already registered to another practitioner'],
        error: 'Conflict',
        timestamp: '',
        path: '/users/1',
      }),
    )
    renderField({ save })
    await openEditor()
    await userEvent.type(screen.getByLabelText('Phone'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(
      await screen.findByText('This license number is already registered to another practitioner'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
  })

  it('Cancel and Escape both throw the draft away', async () => {
    const { save } = renderField()
    await openEditor()
    await userEvent.type(screen.getByLabelText('Phone'), 'xyz')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByText('555-0100')).toBeInTheDocument()

    await openEditor()
    // Re-opened from the stored value, not the abandoned draft.
    expect(screen.getByLabelText('Phone')).toHaveValue('555-0100')
    await userEvent.type(screen.getByLabelText('Phone'), 'xyz{Escape}')
    expect(screen.getByText('555-0100')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('uses a multi-line textarea when asked', async () => {
    renderField({ label: 'Bio', value: null, inputType: 'textarea' })
    await openEditor('Bio')
    expect(screen.getByLabelText('Bio').tagName).toBe('TEXTAREA')
  })
})

describe('ReadOnlyField', () => {
  it('shows the value and the note, and offers no Edit button', () => {
    render(<ReadOnlyField label="Email" value="a@b.com" note="Not editable yet." />)
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    expect(screen.getByText('Not editable yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

// The four optional props added for the program's dates (step 3b-2). Each
// is generic — nothing in them knows about programs.
describe('EditableField — what a field can add', () => {
  it('shows its own words for "no value", in the view and read-only', () => {
    renderField({ label: 'End date', value: null, emptyText: 'No end date' })
    expect(screen.getByText('No end date')).toBeInTheDocument()
    expect(screen.queryByText('Not set')).not.toBeInTheDocument()
  })

  it('passes min and max to the input, to guide the date picker', async () => {
    renderField({
      label: 'End date',
      value: '2031-06-30',
      inputType: 'date',
      min: '2031-06-12',
      max: '2031-12-31',
    })
    await openEditor('End date')
    const input = screen.getByLabelText('End date')
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveAttribute('min', '2031-06-12')
    expect(input).toHaveAttribute('max', '2031-12-31')
  })

  // The note follows the DRAFT (not the stored value), and describes the
  // input — a screen reader reads it with the field.
  it('says what saving the draft would do, as it changes', async () => {
    renderField({
      describeDraft: (draft) => (draft.startsWith('555') ? null : `Saving makes it ${draft}`),
    })
    await openEditor()
    const input = screen.getByLabelText('Phone')
    // Nothing to say for the stored value — but the region is THERE, empty
    // (a region that appears already filled is often not announced), and
    // it's the one the input points at.
    expect(input).toHaveAccessibleDescription('')
    const region = document.getElementById(input.getAttribute('aria-describedby') ?? '')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toBeEmptyDOMElement()
    await userEvent.clear(input)
    await userEvent.type(input, '42')
    expect(input).toHaveAccessibleDescription('Saving makes it 42')
    expect(region).toHaveTextContent('Saving makes it 42')
  })

  it('has no description without describeDraft', async () => {
    renderField()
    await openEditor()
    expect(screen.getByLabelText('Phone')).not.toHaveAttribute('aria-describedby')
  })

  it('saves "no value" with the clear button, without asking the schema', async () => {
    // A schema that refuses '' — the button saves null all the same: it
    // judges what was typed, and nothing was.
    const { save } = renderField({
      label: 'End date',
      value: '2031-06-30',
      schema: requiredSchema,
      clearLabel: 'Remove end date',
    })
    await openEditor('End date')
    await userEvent.click(screen.getByRole('button', { name: 'Remove end date' }))
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(null)
    expect(await screen.findByRole('button', { name: 'Edit End date' })).toBeInTheDocument()
  })

  it('offers the clear button only while a value is stored', async () => {
    renderField({ label: 'End date', value: null, clearLabel: 'Remove end date' })
    await openEditor('End date')
    expect(screen.queryByRole('button', { name: 'Remove end date' })).not.toBeInTheDocument()
  })
})

describe('ReadOnlyField — no value', () => {
  it('shows "Not set", or its own words', () => {
    const { rerender } = render(<ReadOnlyField label="End date" value={null} />)
    expect(screen.getByText('Not set')).toBeInTheDocument()
    rerender(<ReadOnlyField label="End date" value={null} emptyText="No end date" />)
    expect(screen.getByText('No end date')).toBeInTheDocument()
  })
})