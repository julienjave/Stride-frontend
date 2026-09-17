import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableClinicField } from './EditableClinicField'
import { clinicNameSchema, clinicPhoneSchema } from './schemas'
import { clinicQueryKey, clinicsListQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderField(
  props: Partial<React.ComponentProps<typeof EditableClinicField>> = {},
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditableClinicField
        clinicId={1}
        fieldKey="phone"
        label="Phone"
        value="555-1234"
        schema={clinicPhoneSchema}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

describe('EditableClinicField — display mode', () => {
  it('shows the label and current value, with an Edit button', () => {
    renderField({ value: '555-1234' })
    expect(screen.getByText('Phone')).toBeInTheDocument()
    expect(screen.getByText('555-1234')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('shows "Not set" for a null value', () => {
    renderField({ value: null })
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })
})

describe('EditableClinicField — entering and cancelling edit mode', () => {
  it('clicking Edit reveals a pre-filled input with Save/Cancel', async () => {
    const user = userEvent.setup()
    renderField({ value: '555-1234' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('Cancel discards the change and never calls the API', async () => {
    const user = userEvent.setup()
    renderField({ value: '555-1234' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const input = screen.getByDisplayValue('555-1234')
    await user.clear(input)
    await user.type(input, '999-9999')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('555-1234')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('999-9999')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('EditableClinicField — saving a real value', () => {
  it('PATCHes the single field and updates both the detail and list caches', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Acme', phone: '999-9999' }), { status: 200 }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // Pre-seed both caches, the way they'd realistically already be
    // populated by useClinic()/useClinics() before anyone starts editing.
    queryClient.setQueryData(clinicQueryKey(1), { id: 1, name: 'Acme', phone: '555-1234' })
    queryClient.setQueryData(clinicsListQueryKey(), [{ id: 1, name: 'Acme', phone: '555-1234' }])

    const user = userEvent.setup()
    renderField({ value: '555-1234' }, queryClient)
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const input = screen.getByDisplayValue('555-1234')
    await user.clear(input)
    await user.type(input, '999-9999')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/clinics/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ phone: '999-9999' }),
        }),
      ),
    )

    // Back to display mode (Edit button reappears) — the DISPLAYED VALUE
    // updating is a separate concern this isolated test can't observe: in
    // the real app, the parent (ClinicEditPage) re-renders with a fresh
    // `value` prop because its OWN useClinic() call shares this exact
    // cache key, but here `value` is a static prop with nothing re-
    // passing it. That full wired-together behavior is exactly what
    // ClinicEditPage.test.tsx's own integration test checks instead —
    // this test's job is only to confirm what THIS component alone is
    // responsible for: calling the mutation correctly, writing the cache
    // correctly, and leaving edit mode.
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument()
    // The detail cache was written directly (setQueryData), not just
    // marked stale — it should already hold the new object with no
    // further fetch required.
    expect(queryClient.getQueryData(clinicQueryKey(1))).toEqual({
      id: 1,
      name: 'Acme',
      phone: '999-9999',
    })
    // The LIST cache should be invalidated, not synchronously rewritten —
    // confirmed by checking its query state is marked stale.
    expect(queryClient.getQueryState(clinicsListQueryKey())?.isInvalidated).toBe(true)
  })
})

describe('EditableClinicField — clearing a clearable field', () => {
  it('sends an explicit null, not an empty string, when a clearable field is emptied', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: 'Acme', phone: null }), { status: 200 }),
    )

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(clinicQueryKey(1), { id: 1, name: 'Acme', phone: '555-1234' })

    const user = userEvent.setup()
    renderField(
      { value: '555-1234', fieldKey: 'phone', schema: clinicPhoneSchema },
      queryClient,
    )
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByDisplayValue('555-1234'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, init] = fetchMock.mock.calls[0]
    // The real point of this test: assert on the RAW serialized string, so
    // an accidental regression to '' (which JSON.stringify would render
    // identically to a correct implementation if we only checked the
    // parsed object with a loose matcher) can't slip past unnoticed.
    expect(init!.body).toBe('{"phone":null}')

    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(queryClient.getQueryData(clinicQueryKey(1))).toEqual({
      id: 1,
      name: 'Acme',
      phone: null,
    })
  })
})

describe('EditableClinicField — a non-clearable field (name/email)', () => {
  it('rejects an emptied value with a validation error and never calls the API', async () => {
    const user = userEvent.setup()
    renderField({
      fieldKey: 'name',
      label: 'Clinic name',
      value: 'Acme Clinic',
      schema: clinicNameSchema,
    })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByDisplayValue('Acme Clinic'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Clinic name is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('EditableClinicField — a failed save', () => {
  it('shows the generic error banner and stays in edit mode', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ statusCode: 500, message: ['Internal server error'] }), {
        status: 500,
      }),
    )

    const user = userEvent.setup()
    renderField({ value: '555-1234' })
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByDisplayValue('555-1234'))
    await user.type(screen.getByRole('textbox'), '999-9999')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Internal server error')).toBeInTheDocument()
    // Still editable — a failed save should not silently discard the draft.
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})