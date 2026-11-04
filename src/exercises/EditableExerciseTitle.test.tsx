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

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { EditableExerciseTitle } from './EditableExerciseTitle'

// The field no longer sends requests (step D-3): it is given a `save`, and
// its whole job is to ask for the right thing — once, with exactly one
// argument — and to react to how that went. What a save MEANS (which
// request, which cache entry) is each page's, tested there:
// ExerciseDetailPage.test.tsx and AssignedProgramExercisePage.test.tsx.

function renderTitle(
  props: Partial<React.ComponentProps<typeof EditableExerciseTitle>> = {},
) {
  const save = vi.fn<(changes: object) => Promise<unknown>>(() =>
    Promise.resolve(),
  )
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <EditableExerciseTitle name="Wall Slide" canEdit save={save} {...props} />
    </QueryClientProvider>,
  )
  // The default mock; a test that passes its own `save` keeps its own reference.
  return { save, user: userEvent.setup() }
}

async function typeName(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: 'Edit exercise name' }))
  await user.clear(screen.getByLabelText('Exercise name'))
  if (name) await user.type(screen.getByLabelText('Exercise name'), name)
  await user.click(screen.getByRole('button', { name: 'Save name' }))
}

describe('EditableExerciseTitle — display mode', () => {
  it('shows the name as the page title with an edit pencil, when canEdit is true', () => {
    renderTitle({ canEdit: true })
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wall Slide' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Edit exercise name' }),
    ).toBeInTheDocument()
  })

  // A program's page has the PROGRAM as its title: the exercise is below it.
  it('can be a second-level heading', () => {
    renderTitle({ headingLevel: 2 })
    expect(
      screen.getByRole('heading', { level: 2, name: 'Wall Slide' }),
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
  it('Cancel discards the change and saves nothing', async () => {
    const { save, user } = renderTitle()
    await user.click(screen.getByRole('button', { name: 'Edit exercise name' }))
    await user.clear(screen.getByLabelText('Exercise name'))
    await user.type(screen.getByLabelText('Exercise name'), 'New Name')

    await user.click(screen.getByRole('button', { name: 'Cancel editing name' }))

    expect(screen.getByRole('heading', { name: 'Wall Slide' })).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  // '' and '   ' are the same thing to a person — and to the backend since
  // D-1 ("The exercise's name can't be blank").
  it.each([[''], ['   ']])('refuses a blank name (%j) and saves nothing', async (name) => {
    const { save, user } = renderTitle()
    await typeName(user, name)

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  // The limit is the backend's (200, descriptionRules.ts), counted after
  // trimming: 200 letters inside spaces are fine, 201 are not.
  it('accepts 200 characters and refuses 201', async () => {
    const { save, user } = renderTitle()
    await typeName(user, 'a'.repeat(201))
    expect(
      await screen.findByText('Name must be 200 characters or fewer'),
    ).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()

    await user.clear(screen.getByLabelText('Exercise name'))
    await user.type(screen.getByLabelText('Exercise name'), ` ${'a'.repeat(200)} `)
    await user.click(screen.getByRole('button', { name: 'Save name' }))
    expect(save.mock.calls).toStrictEqual([[{ name: 'a'.repeat(200) }]])
  })

  // Exactly one argument: the name, trimmed, under its API key — never the
  // mutation library's own second (context) argument.
  it('asks to save the trimmed name, and leaves edit mode once saved', async () => {
    const { save, user } = renderTitle()
    await typeName(user, '  New Name ')

    expect(
      await screen.findByRole('button', { name: 'Edit exercise name' }),
    ).toBeInTheDocument()
    expect(save.mock.calls).toStrictEqual([[{ name: 'New Name' }]])
  })

  it('shows why saving failed, and stays in edit mode', async () => {
    const save = vi.fn(() =>
      Promise.reject(
        new ApiError({
          statusCode: 400,
          message: ["The exercise's name can't be blank"],
          error: 'Bad Request',
          timestamp: '2031-06-20T10:00:00Z',
          path: '/x',
        }),
      ),
    )
    const { user } = renderTitle({ save })
    await typeName(user, 'New Name')

    expect(
      await screen.findByText("The exercise's name can't be blank"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Exercise name')).toHaveValue('New Name')
  })
})