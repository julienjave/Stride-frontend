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
import { ApiError } from '@/api/client'
import type { PrescriptionChanges } from '@/common/PrescriptionSummary'
import { EditableNotesField } from './EditableNotesField'

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

function renderField(
  notes: string | null = 'Go slow on the way down',
  canEdit = true,
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <EditableNotesField
        save={save}
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
    expect(save).not.toHaveBeenCalled()
  })

  it('saves the new notes', async () => {
    const user = userEvent.setup()
    renderField('Original')
    await user.click(screen.getByRole('button', { name: 'Edit Notes' }))
    await user.clear(screen.getByLabelText('Notes'))
    await user.type(screen.getByLabelText('Notes'), 'Updated notes')
    await user.click(screen.getByRole('button', { name: 'Save Notes' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith({ notes: 'Updated notes' }))
  })

  it('clears the notes by saving an explicit null, not an empty string', async () => {
    const user = userEvent.setup()
    renderField('Original')
    await user.click(screen.getByRole('button', { name: 'Edit Notes' }))
    await user.clear(screen.getByLabelText('Notes'))
    await user.click(screen.getByRole('button', { name: 'Save Notes' }))

    await waitFor(() => expect(save).toHaveBeenCalledWith({ notes: null }))
  })

  it('shows the API error message on a failed save', async () => {
    failWith('Refused by the server')
    const user = userEvent.setup()
    renderField('Original')
    await user.click(screen.getByRole('button', { name: 'Edit Notes' }))
    await user.click(screen.getByRole('button', { name: 'Save Notes' }))

    expect(await screen.findByText('Refused by the server')).toBeInTheDocument()
  })
})