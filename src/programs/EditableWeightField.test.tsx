import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { currentUserQueryKey } from '@/auth/useCurrentUser'
import type { WeightUnit } from '@/common/weight'
import { ApiError } from '@/api/client'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'
import { EditableWeightField } from './EditableWeightField'

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
      statusCode: 400,
      message: [message],
      error: 'Bad Request',
      timestamp: '2031-06-20T10:00:00Z',
      path: '/x',
    }),
  )
}

// `preferredWeightUnit` is the VIEWER's setting, seeded into the current
// user — which also means useCurrentUser() never fetches /auth/me here (no
// network at all: the field saves through the mock `save`).
function renderField(
  props: Partial<React.ComponentProps<typeof EditableWeightField>> = {},
  preferredWeightUnit: WeightUnit = 'kg',
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  queryClient.setQueryData(currentUserQueryKey, { id: 7, preferredWeightUnit })
  return render(
    <QueryClientProvider client={queryClient}>
      <EditableWeightField
        save={save}
        weight={62.5}
        weightUnit="kg"
        canEdit
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

  it('shows the weight but no edit pencil at all when canEdit is false', () => {
    renderField({ weight: 62.5, weightUnit: 'kg', canEdit: false })
    expect(screen.getByText('62.5 kg')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit Weight' }),
    ).not.toBeInTheDocument()
  })

  it('shows "Not set" when neither is set', () => {
    renderField({ weight: null, weightUnit: null })
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })

  // A viewer who prefers lbs, looking at a weight prescribed in kg.
  it("converts to the viewer's preferred unit, with the prescribed value alongside", () => {
    renderField({ weight: 62.5, weightUnit: 'kg' }, 'lbs')
    // 62.5 / 0.45359237 = 137.789… → 137.8
    expect(screen.getByText('137.8 lbs')).toBeInTheDocument()
    expect(screen.getByText('(62.5 kg)')).toBeInTheDocument()
  })

  // …and opening the editor shows the prescription, NOT the converted
  // value: saving untouched must never rewrite 62.5 kg as 137.8 lbs.
  it('edits the stored value in its stored unit, whatever the viewer prefers', async () => {
    const user = userEvent.setup()
    renderField({ weight: 62.5, weightUnit: 'kg' }, 'lbs')
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))

    expect(screen.getByLabelText('Weight')).toHaveValue(62.5)
    expect(screen.getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('EditableWeightField — editing', () => {
  it("pre-selects the viewer's preferred unit when no weight is saved yet", async () => {
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null }, 'lbs')
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))

    expect(screen.getByRole('button', { name: 'lbs' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('saves a typed weight in the pre-selected unit, without touching the toggle', async () => {
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null }, 'lbs')
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.type(screen.getByLabelText('Weight'), '45')
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith({ weight: 45, weightUnit: 'lbs' }))
  })

  // With a unit always selected, an empty box is simply "no weight" —
  // and with none saved either, nothing changed.
  it('closes without a request when no weight is saved or entered', async () => {
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    expect(screen.getByText('Not set')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it('refuses an emptied box over a saved weight, pointing at "Remove weight"', async () => {
    const user = userEvent.setup()
    renderField({ weight: 62.5, weightUnit: 'kg' })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.clear(screen.getByLabelText('Weight'))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    expect(
      await screen.findByText('Enter a weight, or use "Remove weight" to clear it'),
    ).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
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
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.type(screen.getByLabelText('Weight'), '61.25')
    await user.click(screen.getByRole('button', { name: 'lbs' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ weight: 61.25, weightUnit: 'lbs' }),
    )
  })

  it('"Remove weight" clears BOTH halves together, with explicit nulls', async () => {
    const user = userEvent.setup()
    renderField({ weight: 62.5, weightUnit: 'kg' })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.click(screen.getByRole('button', { name: 'Remove weight' }))

    // Both halves, both null — never one alone (hasStartedWeight).
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({ weight: null, weightUnit: null }),
    )
  })

  it('does not offer "Remove weight" when no weight is saved', async () => {
    const user = userEvent.setup()
    renderField({ weight: null, weightUnit: null })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))

    expect(
      screen.queryByRole('button', { name: 'Remove weight' }),
    ).not.toBeInTheDocument()
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
    expect(save).not.toHaveBeenCalled()
  })

  it('shows the API error message on a failed save', async () => {
    failWith('Refused by the server')
    const user = userEvent.setup()
    renderField({ weight: 62.5, weightUnit: 'kg' })
    await user.click(screen.getByRole('button', { name: 'Edit Weight' }))
    await user.click(screen.getByRole('button', { name: 'Save Weight' }))

    expect(await screen.findByText('Refused by the server')).toBeInTheDocument()
  })
})