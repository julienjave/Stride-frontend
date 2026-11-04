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
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScoreScale } from './ScoreScale'

// A parent that keeps the value, as a page does — so the tests see the
// scale as it's really used (controlled), and can read what it reported.
function Harness({
  onChange = () => {},
  initial = null,
  disabled = false,
}: {
  onChange?: (value: number | null) => void
  initial?: number | null
  disabled?: boolean
}) {
  const [value, setValue] = useState<number | null>(initial)
  return (
    <ScoreScale
      legend="How much pain do you have right now?"
      lowLabel="no pain"
      highLabel="worst pain imaginable"
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange(next)
      }}
      disabled={disabled}
    />
  )
}

function group() {
  return screen.getByRole('group', { name: 'How much pain do you have right now?' })
}

describe('ScoreScale', () => {
  it('is a group named by its question, described by what 0 and 10 mean, with eleven choices', () => {
    render(<Harness />)
    expect(group()).toHaveAccessibleDescription('Optional. 0 = no pain, 10 = worst pain imaginable.')
    const radios = screen.getAllByRole('radio')
    expect(radios.map((radio) => radio.getAttribute('value'))).toStrictEqual([
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    ])
    expect(screen.getByRole('radio', { name: '7' })).toBeInTheDocument()
  })

  // Optional: nothing chosen until the patient chooses — what a slider
  // couldn't say.
  it('starts with nothing chosen, and no Clear button', () => {
    render(<Harness />)
    expect(screen.getAllByRole('radio').filter((radio) => (radio as HTMLInputElement).checked)).toStrictEqual([])
    expect(screen.queryByRole('button', { name: /Clear answer/ })).not.toBeInTheDocument()
  })

  it('reports the number tapped, and shows it chosen', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: '3' }))
    expect(onChange.mock.calls).toStrictEqual([[3]])
    expect(screen.getByRole('radio', { name: '3' })).toBeChecked()
  })

  it('reports 0 as an answer — not as "nothing"', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} />)
    await user.click(screen.getByRole('radio', { name: '0' }))
    expect(onChange.mock.calls).toStrictEqual([[0]])
    // 0 is a value: the Clear button appears for it too.
    expect(screen.getByRole('button', { name: /Clear answer/ })).toBeInTheDocument()
  })

  it('moves with the arrow keys, as one radio group', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} initial={4} />)
    await user.click(screen.getByRole('radio', { name: '4' }))
    onChange.mockClear()
    await user.keyboard('{ArrowRight}')
    expect(onChange.mock.calls).toStrictEqual([[5]])
    expect(screen.getByRole('radio', { name: '5' })).toBeChecked()
  })

  it('takes an answer back with "Clear answer", named after its question', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness onChange={onChange} initial={6} />)
    await user.click(
      screen.getByRole('button', { name: 'Clear answer: How much pain do you have right now?' }),
    )
    expect(onChange.mock.calls).toStrictEqual([[null]])
    expect(screen.getAllByRole('radio').some((radio) => (radio as HTMLInputElement).checked)).toBe(false)
    expect(screen.queryByRole('button', { name: /Clear answer/ })).not.toBeInTheDocument()
  })

  // Two scales on one page are two separate groups (pass (c): pain after,
  // mobility after): choosing in one leaves the other alone.
  it('keeps two scales on one page apart', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Harness />
        <ScoreScale
          legend="How freely could you move?"
          lowLabel="not at all"
          highLabel="completely freely"
          value={8}
          onChange={() => {}}
        />
      </>,
    )
    await user.click(screen.getAllByRole('radio', { name: '2' })[0])
    const second = screen.getByRole('group', { name: 'How freely could you move?' })
    expect(second.querySelector('input:checked')).toHaveAttribute('value', '8')
    // What makes them two groups in a browser: their radios' NAMES differ
    // (radios sharing a name are one group, page-wide — choosing in one
    // would untick the other; jsdom doesn't reproduce that across separate
    // React trees' updates, so the name itself is checked).
    const [firstPain] = screen.getAllByRole<HTMLInputElement>('radio', { name: '0' })
    const firstMobility = within(second).getByRole<HTMLInputElement>('radio', { name: '0' })
    expect(firstPain.name).not.toBe(firstMobility.name)
  })

  it('can be disabled as a whole (while a request is on its way)', () => {
    render(<Harness disabled initial={3} />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    expect(screen.getByRole('button', { name: /Clear answer/ })).toBeDisabled()
  })

  // An exercise's difficulty starts at 1 (the column's CHECK is 1–10).
  it('can start at 1: ten choices, the hint saying so', () => {
    render(
      <ScoreScale
        legend="How hard was it?"
        lowLabel="very easy"
        highLabel="very hard"
        value={null}
        onChange={() => {}}
        min={1}
      />,
    )
    expect(screen.getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toStrictEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    ])
    expect(screen.getByRole('group', { name: 'How hard was it?' })).toHaveAccessibleDescription(
      'Optional. 1 = very easy, 10 = very hard.',
    )
  })
})