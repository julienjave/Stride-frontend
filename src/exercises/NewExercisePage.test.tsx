/*
    Copyright 2026 Julien Javelaud

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
// -----------------------------------------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router'
import { NewExercisePage } from './NewExercisePage'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

beforeEach(() => {
  fetchMock.mockReset()
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practitioner/library/new']}>
        <NewExercisePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Title'), 'Wall Slide')
  await user.type(screen.getByLabelText('Primary Muscles 1'), 'shoulders')
  await user.type(screen.getByLabelText('Instructions 1'), 'Stand against a wall.')
}

describe('NewExercisePage', () => {
  it('renders the title and every field label', () => {
    renderPage()
    expect(
      screen.getByText('Add New Exercise to the Library'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByText('Primary Muscles')).toBeInTheDocument()
    expect(screen.getByText('Secondary Muscles (optional)')).toBeInTheDocument()
    expect(screen.getByText('Equipment (optional)')).toBeInTheDocument()
    expect(screen.getByText('Instructions')).toBeInTheDocument()
    expect(screen.getByText('Photos')).toBeInTheDocument()
  })

  it('starts optional fields with zero rows, and required fields with exactly one undeletable row', () => {
    renderPage()

    // Required fields: one row present, no delete button for it.
    expect(screen.getByLabelText('Primary Muscles 1')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete Primary Muscles 1' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Instructions 1')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete Instructions 1' }),
    ).not.toBeInTheDocument()

    // Optional fields: no row shown at all until the person adds one.
    expect(
      screen.queryByLabelText('Secondary Muscles (optional) 1'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('Equipment (optional) 1'),
    ).not.toBeInTheDocument()
  })

  it('adds a new, deletable row when "+ Add primary muscle" is clicked, and removes it on delete', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole('button', { name: '+ Add primary muscle' }),
    )
    const secondRow = screen.getByLabelText('Primary Muscles 2')
    expect(secondRow).toBeInTheDocument()
    // Unlike the first row, this one CAN be deleted.
    const deleteButton = screen.getByRole('button', {
      name: 'Delete Primary Muscles 2',
    })
    expect(deleteButton).toBeInTheDocument()

    await user.click(deleteButton)
    expect(
      screen.queryByLabelText('Primary Muscles 2'),
    ).not.toBeInTheDocument()
    // The mandatory first row is unaffected by deleting a later one.
    expect(screen.getByLabelText('Primary Muscles 1')).toBeInTheDocument()
  })

  it('adding then removing the only row of an optional field returns it to the empty "None added yet" state', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole('button', { name: '+ Add secondary muscle' }),
    )
    expect(
      screen.getByLabelText('Secondary Muscles (optional) 1'),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Delete Secondary Muscles (optional) 1',
      }),
    )
    expect(
      screen.queryByLabelText('Secondary Muscles (optional) 1'),
    ).not.toBeInTheDocument()
  })

  it('shows validation errors and never calls the API when required fields are left empty', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Create Exercise' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    // Both primaryMuscles' and instructions' empty mandatory rows share
    // this exact message — getAllByText, not getByText, since asserting
    // a SINGLE match would be wrong here, not a bug in the app.
    expect(screen.getAllByText('This field cannot be empty')).toHaveLength(2)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits the flattened payload with only required fields filled in', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 42, name: 'Wall Slide' }), {
        status: 201,
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Create Exercise' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/exercises'),
        expect.objectContaining({
          method: 'POST',
          // The REAL point of this test: the {value: string}[] shape
          // useFieldArray requires internally must NOT leak into the
          // actual request body — the backend expects plain string[].
          body: JSON.stringify({
            name: 'Wall Slide',
            primaryMuscles: ['shoulders'],
            secondaryMuscles: [],
            equipment: [],
            instructions: ['Stand against a wall.'],
          }),
        }),
      ),
    )
  })

  it('includes multiple entries across several fields when added', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 42, name: 'Wall Slide' }), {
        status: 201,
      }),
    )
    const user = userEvent.setup()
    renderPage()
    await fillRequiredFields(user)

    await user.click(
      screen.getByRole('button', { name: '+ Add primary muscle' }),
    )
    await user.type(screen.getByLabelText('Primary Muscles 2'), 'traps')

    await user.click(
      screen.getByRole('button', { name: '+ Add equipment' }),
    )
    await user.type(
      screen.getByLabelText('Equipment (optional) 1'),
      'Resistance band',
    )

    await user.click(screen.getByRole('button', { name: 'Create Exercise' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/exercises'),
        expect.objectContaining({
          body: JSON.stringify({
            name: 'Wall Slide',
            primaryMuscles: ['shoulders', 'traps'],
            secondaryMuscles: [],
            equipment: ['Resistance band'],
            instructions: ['Stand against a wall.'],
          }),
        }),
      ),
    )
  })

  it('shows the API error message when creation fails', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ statusCode: 400, message: ['Name already in use'] }),
        { status: 400 },
      ),
    )
    const user = userEvent.setup()
    renderPage()
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Create Exercise' }))

    expect(await screen.findByText('Name already in use')).toBeInTheDocument()
  })

  it('navigates to the photo-management screen for the NEW exercise\'s id on success', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 777, name: 'Wall Slide' }), {
        status: 201,
      }),
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const router = createMemoryRouter(
      [
        { path: '/practitioner/library/new', element: <NewExercisePage /> },
        {
          path: '/practitioner/library/:id/photos',
          element: <div>Manage photos page</div>,
        },
      ],
      { initialEntries: ['/practitioner/library/new'] },
    )

    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Create Exercise' }))

    // Confirms it lands on /practitioner/library/777/photos specifically
    // (the id the mocked response returned), not just "some photos page"
    // — a hardcoded redirect target would pass a looser assertion but be
    // wrong for every exercise except one.
    expect(await screen.findByText('Manage photos page')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(
      '/practitioner/library/777/photos',
    )
  })

  it('has a Cancel link back to the library', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/practitioner/library',
    )
  })
})