import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableExerciseTitle } from './EditableExerciseTitle'
import { exerciseQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderTitle(
  props: Partial<React.ComponentProps<typeof EditableExerciseTitle>> = {},
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditableExerciseTitle
        exerciseId={1}
        name="Wall Slide"
        canEdit
        {...props}
      />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('EditableExerciseTitle — display mode', () => {
  it('shows the name as a heading with an edit pencil, when canEdit is true', () => {
    renderTitle({ canEdit: true })
    expect(screen.getByRole('heading', { name: 'Wall Slide' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit exercise name' }),
    ).toBeInTheDocument()
  })

  it('shows no edit affordance at all when canEdit is false', () => {
    renderTitle({ canEdit: false })
    expect(screen.getByRole('heading', { name: 'Wall Slide' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit exercise name' }),
    ).not.toBeInTheDocument()
  })
})

describe('EditableExerciseTitle — editing', () => {
  it('Cancel discards the change and never calls the API', async () => {
    const user = userEvent.setup()
    renderTitle()
    await user.click(screen.getByRole('button', { name: 'Edit exercise name' }))
    await user.clear(screen.getByLabelText('Exercise name'))
    await user.type(screen.getByLabelText('Exercise name'), 'New Name')

    await user.click(screen.getByRole('button', { name: 'Cancel editing name' }))

    expect(screen.getByRole('heading', { name: 'Wall Slide' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an empty name without calling the API', async () => {
    const user = userEvent.setup()
    renderTitle()
    await user.click(screen.getByRole('button', { name: 'Edit exercise name' }))
    await user.clear(screen.getByLabelText('Exercise name'))

    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('PATCHes the new name, updates the cache, and leaves edit mode', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'New Name' }), { status: 200 }),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(exerciseQueryKey(1), { id: 1, name: 'Wall Slide' })

    const user = userEvent.setup()
    renderTitle({}, queryClient)
    await user.click(screen.getByRole('button', { name: 'Edit exercise name' }))
    await user.clear(screen.getByLabelText('Exercise name'))
    await user.type(screen.getByLabelText('Exercise name'), 'New Name')
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/exercises/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'New Name' }),
        }),
      ),
    )
    // Back to display mode (the edit pencil reappears) — whether the
    // DISPLAYED text itself updates is a separate concern this isolated
    // test can't observe: `name` is a static prop here, with no parent
    // re-passing it after the cache changes. In the real app,
    // ExerciseDetailPage's own useExercise() call shares this exact
    // cache key, so it re-renders with the fresh name — that full
    // wired-together behavior is what ExerciseDetailPage.test.tsx's own
    // integration test checks instead. This test's job is only to
    // confirm what THIS component alone is responsible for: calling the
    // mutation correctly, writing the cache correctly, and leaving edit
    // mode.
    expect(
      await screen.findByRole('button', { name: 'Edit exercise name' }),
    ).toBeInTheDocument()
    expect(queryClient.getQueryData(exerciseQueryKey(1))).toEqual({
      id: 1,
      name: 'New Name',
    })
  })

  it('shows the API error message on a failed save', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 400, message: ['Name already in use'] }),
        { status: 400 },
      ),
    )
    const user = userEvent.setup()
    renderTitle()
    await user.click(screen.getByRole('button', { name: 'Edit exercise name' }))
    await user.click(screen.getByRole('button', { name: 'Save name' }))

    expect(await screen.findByText('Name already in use')).toBeInTheDocument()
  })
})