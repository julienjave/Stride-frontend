import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableExerciseListField } from './EditableExerciseListField'
import { exerciseQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderField(
  props: Partial<
    React.ComponentProps<typeof EditableExerciseListField>
  > = {},
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditableExerciseListField
        exerciseId={1}
        fieldKey="primaryMuscles"
        label="Primary Muscles"
        addButtonLabel="Add primary muscle"
        values={['shoulders']}
        canEdit
        itemMaxLength={100}
        minCount={1}
        maxCount={20}
        itemLabel="primary muscle"
        {...props}
      />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('EditableExerciseListField — display mode', () => {
  it('shows a comma-joined list with an edit pencil, when canEdit is true', () => {
    renderField({ values: ['shoulders', 'traps'], canEdit: true })
    expect(screen.getByText('shoulders, traps')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit Primary Muscles' }),
    ).toBeInTheDocument()
  })

  it('shows "None" for an empty array', () => {
    renderField({ values: [] })
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('shows no edit affordance at all when canEdit is false', () => {
    renderField({ canEdit: false })
    expect(
      screen.queryByRole('button', { name: 'Edit Primary Muscles' }),
    ).not.toBeInTheDocument()
  })
})

describe('EditableExerciseListField — editing', () => {
  it('adds a new row and removes a specific one', async () => {
    const user = userEvent.setup()
    renderField({ values: ['shoulders', 'traps'] })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))

    await user.click(
      screen.getByRole('button', { name: '+ Add primary muscle' }),
    )
    expect(screen.getByLabelText('Primary Muscles 3')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Delete Primary Muscles 1' }),
    )
    // "shoulders" (originally row 1) is gone; "traps" shifts up to row 1.
    expect(screen.getByLabelText('Primary Muscles 1')).toHaveValue('traps')
  })

  it('Cancel discards every change and never calls the API', async () => {
    const user = userEvent.setup()
    renderField({ values: ['shoulders'] })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(
      screen.getByRole('button', { name: '+ Add primary muscle' }),
    )

    await user.click(
      screen.getByRole('button', { name: 'Cancel editing Primary Muscles' }),
    )

    expect(screen.getByText('shoulders')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects removing the only entry from a required field, without calling the API', async () => {
    const user = userEvent.setup()
    renderField({ values: ['shoulders'], minCount: 1 })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(
      screen.getByRole('button', { name: 'Delete Primary Muscles 1' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Save Primary Muscles' }),
    )

    expect(
      await screen.findByText('At least one primary muscle is required'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an entry left blank, without calling the API', async () => {
    const user = userEvent.setup()
    renderField({ values: ['shoulders'] })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.clear(screen.getByLabelText('Primary Muscles 1'))
    await user.click(
      screen.getByRole('button', { name: 'Save Primary Muscles' }),
    )

    expect(
      await screen.findByText('This field cannot be empty'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('saves valid changes under the correct field key, updating the cache and leaving edit mode', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ id: 1, primaryMuscles: ['shoulders', 'traps'] }),
        { status: 200 },
      ),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(exerciseQueryKey(1), {
      id: 1,
      primaryMuscles: ['shoulders'],
    })

    const user = userEvent.setup()
    renderField({ values: ['shoulders'] }, queryClient)
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(
      screen.getByRole('button', { name: '+ Add primary muscle' }),
    )
    await user.type(screen.getByLabelText('Primary Muscles 2'), 'traps')
    await user.click(
      screen.getByRole('button', { name: 'Save Primary Muscles' }),
    )

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/exercises/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ primaryMuscles: ['shoulders', 'traps'] }),
        }),
      ),
    )
    // Back to display mode — same reasoning as EditableExerciseTitle's
    // own equivalent test: `values` is a static prop in this isolated
    // test, so the DISPLAYED text staying as the old value here doesn't
    // mean the real app is wrong. ExerciseDetailPage.test.tsx's own
    // integration test covers the full wired-together behavior instead.
    expect(
      await screen.findByRole('button', { name: 'Edit Primary Muscles' }),
    ).toBeInTheDocument()
    expect(queryClient.getQueryData(exerciseQueryKey(1))).toEqual({
      id: 1,
      primaryMuscles: ['shoulders', 'traps'],
    })
  })

  it('shows the API error message on a failed save', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 500, message: ['Internal server error'] }),
        { status: 500 },
      ),
    )
    const user = userEvent.setup()
    renderField({ values: ['shoulders'] })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(
      screen.getByRole('button', { name: 'Save Primary Muscles' }),
    )

    expect(
      await screen.findByText('Internal server error'),
    ).toBeInTheDocument()
  })
})

describe('EditableExerciseListField — an optional field with no minimum', () => {
  it('accepts saving down to zero entries', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, secondaryMuscles: [] }), {
        status: 200,
      }),
    )
    const user = userEvent.setup()
    renderField({
      fieldKey: 'secondaryMuscles',
      label: 'Secondary Muscles',
      values: ['core'],
      minCount: undefined,
      itemLabel: 'secondary muscle',
    })
    await user.click(
      screen.getByRole('button', { name: 'Edit Secondary Muscles' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Delete Secondary Muscles 1' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Save Secondary Muscles' }),
    )

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/exercises/1'),
        expect.objectContaining({
          body: JSON.stringify({ secondaryMuscles: [] }),
        }),
      ),
    )
  })
})