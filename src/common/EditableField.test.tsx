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