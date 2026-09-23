import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableWeightField } from './EditableWeightField'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderField(
  props: Partial<React.ComponentProps<typeof EditableWeightField>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <EditableWeightField
        templateId={1}
        templateExerciseId={50}
        weight={62.5}
        weightUnit="kg"
        {...props}
      />
    </QueryClientProvider>,
  )
}

describe('EditableWeightField — display mode', () => {
  it('shows the weight and unit together', () => {
    renderField({ weight: 62.5, weightUnit: 'kg' })
    expect(screen.getByText('62.5 kg')).toBeInTheDocument()
  })

  it('shows "Not set" when neither is set', () => {
    renderField({ weight: null, weightUnit: null })
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })
})

describe('EditableWeightField — editing', () => {
  it('rejects a weight without a selected unit', async () => {
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.type(screen.getByLabelText('Weight'), '50')
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    expect(
      await screen.findByText('Select a unit for the weight'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a unit selected without a weight', async () => {
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.click(screen.getByRole('button', { name: 'kg' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    expect(
      await screen.findByText('Enter a weight for the selected unit'),
    ).toBeInTheDocument()
  })

  it('rejects clearing the weight while leaving a previously-selected unit in place', async () => {
    const user = userEvent.setup()
    renderField({ weight: 62.5, weightUnit: 'kg' })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.clear(screen.getByLabelText('Weight'))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    expect(
      await screen.findByText('Enter a weight for the selected unit'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a negative weight', async () => {
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.type(screen.getByLabelText('Weight'), '-5')
    await user.click(screen.getByRole('button', { name: 'kg' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    expect(
      await screen.findByText('Weight cannot be negative'),
    ).toBeInTheDocument()
  })

  it('saves a valid weight and unit together', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    )
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.type(screen.getByLabelText('Weight'), '61.25')
    await user.click(screen.getByRole('button', { name: 'lbs' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1/exercises/50'),
        expect.objectContaining({
          body: JSON.stringify({ weight: 61.25, weightUnit: 'lbs' }),
        }),
      ),
    )
  })

  it('Cancel discards changes and never calls the API', async () => {
    const user = userEvent.setup()
    renderField({ weight: 62.5, weightUnit: 'kg' })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.clear(screen.getByLabelText('Weight'))
    await user.type(screen.getByLabelText('Weight'), '100')

    await user.click(
      screen.getByRole('button', { name: 'Cancel editing Weight' }),
    )

    expect(screen.getByText('62.5 kg')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows the API error message on a failed save', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 500, message: ['Internal error'] }),
        { status: 500 },
      ),
    )
    const user = userEvent.setup()
    renderField({ weight: 62.5, weightUnit: 'kg' })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    expect(await screen.findByText('Internal error')).toBeInTheDocument()
  })
})