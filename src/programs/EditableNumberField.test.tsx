import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableNumberField } from './EditableNumberField'
import { ApiError } from '@/api/client'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'

// Since step 3b-1b the field doesn't send requests itself: the page gives it
// a `save` (a template's page PATCHes the template, a program's page the
// program). So these tests give it a MOCK save and check what it's asked to
// save — exactly the field's job. Whether a page turns that into the right
// request (URL, literal body, cache) is tested on each page
// (ProgramExercisePage.test, AssignedProgramExercisePage.test).
//
// `toHaveBeenCalledWith({ sets: null })` tells null from undefined (`{ sets:
// undefined }` would NOT match), so "cleared is sent as null" is still
// checked; what it can't see is JSON dropping undefined keys — hence the
// literal-body tests on the pages.
const save = vi.fn<(changes: PrescriptionChanges) => Promise<unknown>>()

beforeEach(() => {
  save.mockReset()
  save.mockResolvedValue(undefined)
})

// What a failed save rejects with: the page's request threw this ApiError.
function failWith(message: string) {
  save.mockRejectedValue(
    new ApiError({
      statusCode: 500,
      message: [message],
      error: 'Internal Server Error',
      timestamp: '2031-06-20T10:00:00Z',
      path: '/x',
    }),
  )
}

function renderField(
  props: Partial<React.ComponentProps<typeof EditableNumberField>> = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <EditableNumberField
        save={save}
        fieldKey="sets"
        label="Sets"
        value={3}
        canEdit
        {...props}
      />
    </QueryClientProvider>,
  )
}

describe('EditableNumberField — display mode', () => {
  it('shows the label, value, and an edit pencil', () => {
    renderField({ value: 3 })
    expect(screen.getByText('Sets')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Sets' })).toBeInTheDocument()
  })

  it('shows the value but no edit pencil at all when canEdit is false', () => {
    renderField({ value: 3, canEdit: false })
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit Sets' }),
    ).not.toBeInTheDocument()
  })

  it('shows "Not set" for a null value', () => {
    renderField({ value: null })
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('appends the display suffix when provided', () => {
    renderField({ fieldKey: 'durationInSeconds', label: 'Duration', value: 45, displaySuffix: 's' })
    expect(screen.getByText('45s')).toBeInTheDocument()
  })
})

describe('EditableNumberField — editing', () => {
  it('Cancel discards the change and never calls the API', async () => {
    const user = userEvent.setup()
    renderField({ value: 3 })
    await user.click(screen.getByRole('button', { name: 'Edit Sets' }))
    await user.clear(screen.getByLabelText('Sets'))
    await user.type(screen.getByLabelText('Sets'), '10')

    await user.click(screen.getByRole('button', { name: 'Cancel editing Sets' }))

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('rejects a non-positive value without calling the API', async () => {
    const user = userEvent.setup()
    renderField({ value: 3 })
    await user.click(screen.getByRole('button', { name: 'Edit Sets' }))
    await user.clear(screen.getByLabelText('Sets'))
    await user.type(screen.getByLabelText('Sets'), '0')
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    expect(
      await screen.findByText('Sets must be a positive whole number'),
    ).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('clears the field by saving an explicit null', async () => {
    const user = userEvent.setup()
    renderField({ value: 3 })
    await user.click(screen.getByRole('button', { name: 'Edit Sets' }))
    await user.clear(screen.getByLabelText('Sets'))
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith({ sets: null }))
  })

  it('saves a valid value under the correct field key, then closes', async () => {
    const user = userEvent.setup()
    renderField({ fieldKey: 'reps', label: 'Reps', value: 10 })
    await user.click(screen.getByRole('button', { name: 'Edit Reps' }))
    await user.clear(screen.getByLabelText('Reps'))
    await user.type(screen.getByLabelText('Reps'), '5')
    await user.click(screen.getByRole('button', { name: 'Save Reps' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith({ reps: 5 }))
    expect(save).toHaveBeenCalledTimes(1)
    // Back to display mode — `value` is a static prop here, with no parent
    // re-passing it after the save, so this only checks what THIS
    // component alone is responsible for: closing once the save finished.
    expect(await screen.findByRole('button', { name: 'Edit Reps' })).toBeInTheDocument()
  })

  // Closing waits for the save: a field that closed at once would hide a
  // failure behind the old value.
  it('stays open, disabled, while the save is on its way', async () => {
    let finish: () => void = () => {}
    save.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)))
    const user = userEvent.setup()
    renderField({ value: 3 })
    await user.click(screen.getByRole('button', { name: 'Edit Sets' }))
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    expect(screen.getByLabelText('Sets')).toBeDisabled()
    finish()
    expect(await screen.findByRole('button', { name: 'Edit Sets' })).toBeInTheDocument()
  })

  it('shows the API error message on a failed save', async () => {
    failWith('Internal error')
    const user = userEvent.setup()
    renderField({ value: 3 })
    await user.click(screen.getByRole('button', { name: 'Edit Sets' }))
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    expect(await screen.findByText('Internal error')).toBeInTheDocument()
  })
})