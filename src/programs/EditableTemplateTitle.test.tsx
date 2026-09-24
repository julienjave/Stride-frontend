import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EditableTemplateTitle } from './EditableTemplateTitle'
import { programQueryKey, programsListQueryKey } from './api'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderTitle(
  props: Partial<React.ComponentProps<typeof EditableTemplateTitle>> = {},
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <EditableTemplateTitle
        templateId={1}
        title="Shoulder Rehab"
        canEdit
        {...props}
      />
    </QueryClientProvider>,
  )
  return { ...utils, queryClient }
}

async function startEditing(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Edit template title' }))
}

describe('EditableTemplateTitle — display mode', () => {
  it('shows the title as a heading with an edit pencil, when canEdit is true', () => {
    renderTitle({ canEdit: true })
    expect(
      screen.getByRole('heading', { name: 'Shoulder Rehab' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit template title' }),
    ).toBeInTheDocument()
  })

  it('shows no edit affordance at all when canEdit is false', () => {
    renderTitle({ canEdit: false })
    expect(
      screen.getByRole('heading', { name: 'Shoulder Rehab' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edit template title' }),
    ).not.toBeInTheDocument()
  })
})

describe('EditableTemplateTitle — adornment', () => {
  it('shows the adornment beside the title in display mode, and hides it while editing', async () => {
    const user = userEvent.setup()
    renderTitle({ adornment: <span>Badge here</span> })
    expect(screen.getByText('Badge here')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit template title' }))

    expect(screen.queryByText('Badge here')).not.toBeInTheDocument()
  })
})

describe('EditableTemplateTitle — editing', () => {
  it('Cancel discards the change and never calls the API', async () => {
    const user = userEvent.setup()
    renderTitle()
    await startEditing(user)
    await user.clear(screen.getByLabelText('Template title'))
    await user.type(screen.getByLabelText('Template title'), 'Something Else')

    await user.click(screen.getByRole('button', { name: 'Cancel editing title' }))

    expect(
      screen.getByRole('heading', { name: 'Shoulder Rehab' }),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an empty (or whitespace-only) title without calling the API', async () => {
    const user = userEvent.setup()
    renderTitle()
    await startEditing(user)
    await user.clear(screen.getByLabelText('Template title'))
    await user.type(screen.getByLabelText('Template title'), '   ')

    await user.click(screen.getByRole('button', { name: 'Save title' }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a title over 200 characters without calling the API', async () => {
    const user = userEvent.setup()
    renderTitle()
    await startEditing(user)
    // paste instead of type: typing 201 characters one keystroke at a
    // time is slow, and this test is about the limit, not the typing.
    await user.clear(screen.getByLabelText('Template title'))
    await user.click(screen.getByLabelText('Template title'))
    await user.paste('a'.repeat(201))

    await user.click(screen.getByRole('button', { name: 'Save title' }))

    expect(
      await screen.findByText('Title must be 200 characters or fewer'),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('PATCHes the trimmed title, then updates both the detail and list caches', async () => {
    const updated = {
      id: 1,
      practitionerId: 7,
      title: 'Renamed',
      description: null,
      isArchived: false,
      exercises: [],
    }
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(updated), { status: 200 }),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    queryClient.setQueryData(programsListQueryKey, [
      { id: 1, practitionerId: 7, title: 'Shoulder Rehab', description: null, isArchived: false },
    ])
    const user = userEvent.setup()
    renderTitle({}, queryClient)
    await startEditing(user)
    await user.clear(screen.getByLabelText('Template title'))
    await user.type(screen.getByLabelText('Template title'), '  Renamed  ')

    await user.click(screen.getByRole('button', { name: 'Save title' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/programs/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ title: 'Renamed' }),
        }),
      ),
    )
    // Back to display mode once saved.
    await waitFor(() =>
      expect(
        screen.queryByLabelText('Template title'),
      ).not.toBeInTheDocument(),
    )
    expect(queryClient.getQueryData(programQueryKey(1))).toEqual(updated)
    expect(queryClient.getQueryData(programsListQueryKey)).toEqual([
      { id: 1, practitionerId: 7, title: 'Renamed', description: null, isArchived: false },
    ])
  })

  it("shows the backend's error message and stays in edit mode when the save fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 403, message: ['Not your template'] }),
        { status: 403 },
      ),
    )
    const user = userEvent.setup()
    renderTitle()
    await startEditing(user)
    await user.type(screen.getByLabelText('Template title'), '!')

    await user.click(screen.getByRole('button', { name: 'Save title' }))

    expect(await screen.findByText('Not your template')).toBeInTheDocument()
    expect(screen.getByLabelText('Template title')).toBeInTheDocument()
  })
})