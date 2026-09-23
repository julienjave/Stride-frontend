import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableNotesField } from './EditableNotesField'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderField(
  notes: string | null = 'Go slow on the way down',
  canEdit = true,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <EditableNotesField
        templateId={1}
        templateExerciseId={50}
        notes={notes}
        canEdit={canEdit}
      />
    </QueryClientProvider>,
  )
}

describe('EditableNotesField', () => {
  it('shows the current notes with an edit pencil', () => {
    renderField('Go slow on the way down')
    expect(screen.getByText('Go slow on the way down')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Notes' })).toBeInTheDocument()
  })

  it('shows the notes but no edit pencil at all when canEdit is false', () => {
    renderField('Go slow on the way down', false)
    expect(screen.getByText('Go slow on the way down')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit Notes' }),
    ).not.toBeInTheDocument()
  })

  it('shows "Not set" when there are no notes', () => {
    renderField(null)
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  it('Cancel discards the change and never calls the API', async () => {
    const user = userEvent.setup()
    renderField('Original')
    await user.click(screen.getByRole('button', { name: 'Edit Notes' }))
    await user.clear(screen.getByLabelText('Notes'))
    await user.type(screen.getByLabelText('Notes'), 'Changed')

    await user.click(screen.getByRole('button', { name: 'Cancel editing Notes' }))

    expect(screen.getByText('Original')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('saves the new notes', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    )
    const user = userEvent.setup()
    renderField('Original')
    await user.click(screen.getByRole('button', { name: 'Edit Notes' }))
    await user.clear(screen.getByLabelText('Notes'))
    await user.type(screen.getByLabelText('Notes'), 'Updated notes')
    await user.click(screen.getByRole('button', { name: 'Save Notes' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises/50'),
        expect.objectContaining({
          body: JSON.stringify({ notes: 'Updated notes' }),
        }),
      ),
    )
  })

  it('shows the API error message on a failed save', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 500, message: ['Internal error'] }),
        { status: 500 },
      ),
    )
    const user = userEvent.setup()
    renderField('Original')
    await user.click(screen.getByRole('button', { name: 'Edit Notes' }))
    await user.click(screen.getByRole('button', { name: 'Save Notes' }))

    expect(await screen.findByText('Internal error')).toBeInTheDocument()
  })
})