import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { z } from 'zod'
import { EditableTags } from './EditableTags'

const itemSchema = z.string().trim().min(1).max(20, 'Too long')

function renderTags(values: string[] = ['Ortho'], maxItems = 5) {
  const save = vi.fn().mockResolvedValue(undefined)
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <EditableTags
        label="Specialties"
        values={values}
        itemSchema={itemSchema}
        maxItems={maxItems}
        save={save}
      />
    </QueryClientProvider>,
  )
  return { save }
}

async function openEditor() {
  await userEvent.click(screen.getByRole('button', { name: 'Edit Specialties' }))
}

// The chips currently in the editor, read from the list the component
// renders (each chip is a list item).
function chipTexts() {
  return within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('EditableTags — viewing', () => {
  it('shows each value as a separate item', () => {
    renderTags(['Ortho', 'Sports'])
    expect(chipTexts()).toEqual(['Ortho', 'Sports'])
  })

  it('shows "Not set" for an empty list', () => {
    renderTags([])
    expect(screen.getByText('Not set')).toBeInTheDocument()
  })
})

describe('EditableTags — editing', () => {
  it('adds an entry on Enter — without submitting the form', async () => {
    const { save } = renderTags()
    await openEditor()
    await userEvent.type(screen.getByLabelText('Specialties'), 'Sports{Enter}')
    expect(chipTexts()).toEqual(['Ortho', 'Sports'])
    expect(screen.getByLabelText('Specialties')).toHaveValue('')
    // Enter added a chip; it did NOT save.
    expect(save).not.toHaveBeenCalled()
  })

  it('a comma finishes an entry too', async () => {
    renderTags()
    await openEditor()
    await userEvent.type(screen.getByLabelText('Specialties'), 'Sports,Neu')
    expect(chipTexts()).toEqual(['Ortho', 'Sports'])
    expect(screen.getByLabelText('Specialties')).toHaveValue('Neu')
  })

  it('removes a chip with its × button', async () => {
    renderTags(['Ortho', 'Sports'])
    await openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ortho' }))
    expect(chipTexts()).toEqual(['Sports'])
  })

  it('Backspace in the empty box removes the last chip', async () => {
    renderTags(['Ortho', 'Sports'])
    await openEditor()
    await userEvent.type(screen.getByLabelText('Specialties'), '{Backspace}')
    expect(chipTexts()).toEqual(['Ortho'])
  })

  it('refuses a duplicate, keeping it in the box with a message', async () => {
    renderTags()
    await openEditor()
    await userEvent.type(screen.getByLabelText('Specialties'), 'ortho{Enter}')
    expect(screen.getByText('"ortho" is already in the list')).toBeInTheDocument()
    expect(chipTexts()).toEqual(['Ortho'])
    expect(screen.getByLabelText('Specialties')).toHaveValue('ortho')
  })

  it('refuses to go past the maximum', async () => {
    renderTags(['A', 'B'], 2)
    await openEditor()
    await userEvent.type(screen.getByLabelText('Specialties'), 'C{Enter}')
    expect(screen.getByText('You can add up to 2')).toBeInTheDocument()
  })

  it('saves the whole list — including text typed but not yet confirmed', async () => {
    const { save } = renderTags()
    await openEditor()
    await userEvent.type(screen.getByLabelText('Specialties'), 'Sports{Enter}Neuro')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    // Every call, with EVERY argument: exactly one call, given exactly the
    // list. TanStack Query hands a mutationFn a second argument (its
    // context); `save` must not receive it (toStrictEqual on mock.calls
    // fails on an extra argument, which [0][0] would never see).
    expect(save.mock.calls).toStrictEqual([[['Ortho', 'Sports', 'Neuro']]])
  })

  it('saves an emptied list as [] — "no specialties" is a real value', async () => {
    const { save } = renderTags()
    await openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Ortho' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save.mock.calls[0][0]).toEqual([])
  })

  it('closes without a request when nothing changed', async () => {
    const { save } = renderTags()
    await openEditor()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Edit Specialties' })).toBeInTheDocument()
  })

  it('Cancel discards every change', async () => {
    const { save } = renderTags(['Ortho'])
    await openEditor()
    await userEvent.type(screen.getByLabelText('Specialties'), 'Sports{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(chipTexts()).toEqual(['Ortho'])
    expect(save).not.toHaveBeenCalled()
  })
})