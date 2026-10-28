import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { EditableExerciseListField } from './EditableExerciseListField'
import { EXERCISE_LIST_RULES } from './descriptionRules'

// The field no longer sends requests (step D-3): it is given a `save`, and
// its job is to ask for the right list — trimmed, once, with exactly one
// argument — or to say why it won't. The requests themselves are each
// page's, tested there (ExerciseDetailPage, AssignedProgramExercisePage).

function renderField(
  props: Partial<React.ComponentProps<typeof EditableExerciseListField>> = {},
) {
  const save = vi.fn<(changes: object) => Promise<unknown>>(() =>
    Promise.resolve(),
  )
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <EditableExerciseListField
        save={save}
        fieldKey="primaryMuscles"
        values={['shoulders']}
        canEdit
        // The rules of the list under test — spread whole, so an optional
        // list never inherits another list's minCount.
        {...EXERCISE_LIST_RULES[props.fieldKey ?? 'primaryMuscles']}
        {...props}
      />
    </QueryClientProvider>,
  )
  // The default mock; a test that passes its own `save` keeps its own reference.
  return { save, user: userEvent.setup() }
}

describe('EditableExerciseListField — display mode', () => {
  it('shows a comma-joined list with an edit pencil, when canEdit is true', () => {
    renderField({ values: ['shoulders', 'traps'], canEdit: true })
    expect(screen.getByText('shoulders, traps')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit Primary Muscles' }),
    ).toBeInTheDocument()
  })

  // Steps are read in order: a numbered list, one item per step.
  it('shows a multi-line field as a numbered list', () => {
    renderField({
      fieldKey: 'instructions',
      values: ['Lie on your back', 'Lift your hips'],
    })
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toStrictEqual([
      'Lie on your back',
      'Lift your hips',
    ])
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
    const { user } = renderField({ values: ['shoulders', 'traps'] })
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

  it('Cancel discards every change and saves nothing', async () => {
    const { save, user } = renderField({ values: ['shoulders'] })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(
      screen.getByRole('button', { name: '+ Add primary muscle' }),
    )

    await user.click(
      screen.getByRole('button', { name: 'Cancel editing Primary Muscles' }),
    )

    expect(screen.getByText('shoulders')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('refuses removing the only entry of a required list, and saves nothing', async () => {
    const { save, user } = renderField({ values: ['shoulders'] })
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
    expect(save).not.toHaveBeenCalled()
  })

  // An entry of spaces is blank: the field trims before checking (the
  // backend refuses it too since D-1).
  it.each([[''], ['   ']])('refuses an entry left blank (%j), and saves nothing', async (text) => {
    const { save, user } = renderField({ values: ['shoulders'] })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.clear(screen.getByLabelText('Primary Muscles 1'))
    if (text) await user.type(screen.getByLabelText('Primary Muscles 1'), text)
    await user.click(
      screen.getByRole('button', { name: 'Save Primary Muscles' }),
    )

    expect(
      await screen.findByText('This field cannot be empty'),
    ).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  // The whole list, each entry trimmed, under the field's API key — exactly
  // one argument (never the mutation library's context).
  it('asks to save the trimmed list, and leaves edit mode once saved', async () => {
    const { save, user } = renderField({ values: ['shoulders'] })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(
      screen.getByRole('button', { name: '+ Add primary muscle' }),
    )
    await user.type(screen.getByLabelText('Primary Muscles 2'), '  traps ')
    await user.click(
      screen.getByRole('button', { name: 'Save Primary Muscles' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Edit Primary Muscles' }),
    ).toBeInTheDocument()
    expect(save.mock.calls).toStrictEqual([
      [{ primaryMuscles: ['shoulders', 'traps'] }],
    ])
  })

  it('shows why saving failed, and stays in edit mode', async () => {
    const save = vi.fn(() =>
      Promise.reject(
        new ApiError({
          statusCode: 400,
          message: ["A primary muscle can't be blank"],
          error: 'Bad Request',
          timestamp: '2031-06-20T10:00:00Z',
          path: '/x',
        }),
      ),
    )
    const { user } = renderField({ values: ['shoulders'], save })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(
      screen.getByRole('button', { name: 'Save Primary Muscles' }),
    )

    expect(
      await screen.findByText("A primary muscle can't be blank"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Primary Muscles 1')).toHaveValue('shoulders')
  })

  it("says something went wrong when the failure isn't the backend's", async () => {
    const save = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    const { user } = renderField({ save })
    await user.click(screen.getByRole('button', { name: 'Edit Primary Muscles' }))
    await user.click(
      screen.getByRole('button', { name: 'Save Primary Muscles' }),
    )

    expect(
      await screen.findByText('Something went wrong. Check your connection and try again.'),
    ).toBeInTheDocument()
  })
})

describe('EditableExerciseListField — an optional list', () => {
  // "None" is an empty list — what the backend expects for these two lists
  // (it refuses null since D-1).
  it('saves down to zero entries, as []', async () => {
    const { save, user } = renderField({
      fieldKey: 'secondaryMuscles',
      values: ['core'],
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

    expect(
      await screen.findByRole('button', { name: 'Edit Secondary Muscles' }),
    ).toBeInTheDocument()
    expect(save.mock.calls).toStrictEqual([[{ secondaryMuscles: [] }]])
  })
})