import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableNumberField } from './EditableNumberField'
import { programQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderField(
  props: Partial<React.ComponentProps<typeof EditableNumberField>> = {},
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <EditableNumberField
        templateId={1}
        templateExerciseId={50}
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
    expect(fetchMock).not.toHaveBeenCalled()
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
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows clearing the field entirely — undefined is a valid value, not an error', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    )
    const user = userEvent.setup()
    renderField({ value: 3 })
    await user.click(screen.getByRole('button', { name: 'Edit Sets' }))
    await user.clear(screen.getByLabelText('Sets'))
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises/50'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ sets: undefined }),
        }),
      ),
    )
  })

  it('saves a valid value under the correct field key, updating the cache', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, exercises: [] }), { status: 200 }),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const user = userEvent.setup()
    renderField({ value: 3 }, queryClient)
    await user.click(screen.getByRole('button', { name: 'Edit Sets' }))
    await user.clear(screen.getByLabelText('Sets'))
    await user.type(screen.getByLabelText('Sets'), '5')
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises/50'),
        expect.objectContaining({
          body: JSON.stringify({ sets: 5 }),
        }),
      ),
    )
    // Back to display mode — same reasoning as EditableExerciseTitle's
    // own equivalent test: `value` is a static prop here, with no
    // parent re-passing it after the cache changes, so this only checks
    // what THIS component alone is responsible for.
    expect(
      await screen.findByRole('button', { name: 'Edit Sets' }),
    ).toBeInTheDocument()
    expect(queryClient.getQueryData(programQueryKey(1))).toEqual({
      id: 1,
      exercises: [],
    })
  })

  it('shows the API error message on a failed save', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 500, message: ['Internal error'] }),
        { status: 500 },
      ),
    )
    const user = userEvent.setup()
    renderField({ value: 3 })
    await user.click(screen.getByRole('button', { name: 'Edit Sets' }))
    await user.click(screen.getByRole('button', { name: 'Save Sets' }))

    expect(await screen.findByText('Internal error')).toBeInTheDocument()
  })
})