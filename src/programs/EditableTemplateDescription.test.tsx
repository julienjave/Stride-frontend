import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableTemplateDescription } from './EditableTemplateDescription'
import { programQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderDescription(
  props: Partial<React.ComponentProps<typeof EditableTemplateDescription>> = {},
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditableTemplateDescription
        templateId={1}
        description="Post-op, weeks 1–4"
        canEdit
        {...props}
      />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

function templateResponse(description: string | null) {
  return new Response(
    JSON.stringify({
      id: 1,
      practitionerId: 7,
      title: 'Shoulder Rehab',
      description,
      isArchived: false,
      exercises: [],
    }),
    { status: 200 },
  )
}

describe('EditableTemplateDescription — display mode', () => {
  it('shows the description with an edit pencil', () => {
    renderDescription()
    expect(screen.getByText('Post-op, weeks 1–4')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit description' }),
    ).toBeInTheDocument()
  })

  it('shows "No description" when there is none', () => {
    renderDescription({ description: null })
    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('shows no edit affordance at all when canEdit is false', () => {
    renderDescription({ canEdit: false })
    expect(screen.getByText('Post-op, weeks 1–4')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit description' }),
    ).not.toBeInTheDocument()
  })
})

describe('EditableTemplateDescription — editing', () => {
  it('Cancel discards the change and never calls the API', async () => {
    const user = userEvent.setup()
    renderDescription()
    await user.click(screen.getByRole('button', { name: 'Edit description' }))
    await user.type(screen.getByLabelText('Description'), ' and more')

    await user.click(
      screen.getByRole('button', { name: 'Cancel editing description' }),
    )

    expect(screen.getByText('Post-op, weeks 1–4')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('PATCHes the trimmed description and updates the cache', async () => {
    fetchMock.mockResolvedValue(templateResponse('New description'))
    const user = userEvent.setup()
    const { queryClient } = renderDescription()
    await user.click(screen.getByRole('button', { name: 'Edit description' }))
    await user.clear(screen.getByLabelText('Description'))
    await user.type(screen.getByLabelText('Description'), '  New description  ')

    await user.click(screen.getByRole('button', { name: 'Save description' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ description: 'New description' }),
        }),
      ),
    )
    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ description: string }>(programQueryKey(1))
          ?.description,
      ).toBe('New description'),
    )
  })

  it('clears the description by sending an explicit null — not an empty string, and not undefined', async () => {
    fetchMock.mockResolvedValue(templateResponse(null))
    const user = userEvent.setup()
    renderDescription()
    await user.click(screen.getByRole('button', { name: 'Edit description' }))
    await user.clear(screen.getByLabelText('Description'))

    await user.click(screen.getByRole('button', { name: 'Save description' }))

    // The exact body string matters here: { description: undefined }
    // would serialize to "{}" and silently change nothing on the server.
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: '{"description":null}',
        }),
      ),
    )
  })

  it('rejects a description over 2000 characters without calling the API', async () => {
    const user = userEvent.setup()
    renderDescription({ description: null })
    await user.click(screen.getByRole('button', { name: 'Edit description' }))
    await user.click(screen.getByLabelText('Description'))
    await user.paste('a'.repeat(2001))

    await user.click(screen.getByRole('button', { name: 'Save description' }))

    expect(
      await screen.findByText('Description must be 2000 characters or fewer'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})