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

import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  id: string
  tags: string[]
  // The text currently typed in the box, not yet turned into a tag.
  text: string
  onTextChange: (text: string) => void
  // Enter pressed: turn the typed text into a tag.
  onCommit: () => void
  onRemove: (index: number) => void
  invalid?: boolean
  disabled?: boolean
  placeholder?: string
}

// A text box that holds its entries as removable "chips" — what people
// expect for a list of short values like specialties.
//
// Deliberately "controlled" and rule-free: the tags AND the typed text
// both live in the parent (EditableTags), which decides what's allowed
// (tagList.ts). This component only draws them and reports keystrokes.
// That split keeps each piece small and testable, and the parent can
// read the half-typed text at Save time — so a specialty typed but not
// yet confirmed with Enter isn't silently lost.
export function TagInput({
  id,
  tags,
  text,
  onTextChange,
  onCommit,
  onRemove,
  invalid,
  disabled,
  placeholder,
}: TagInputProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      // Inside a <form>, Enter would SUBMIT it (i.e. save everything).
      // Here Enter means "add this tag" — preventDefault() stops the
      // submit so the two actions stay separate.
      event.preventDefault()
      onCommit()
    } else if (event.key === 'Backspace' && text === '' && tags.length > 0) {
      // A familiar shortcut from chip inputs: Backspace in an empty box
      // removes the last chip. Only when the box is EMPTY, so ordinary
      // Backspace still deletes typed characters.
      onRemove(tags.length - 1)
    }
  }

  return (
    // Styled like <Input>, with the real input borderless inside it:
    // `focus-within` lights up the frame when the inner input has focus,
    // so the whole thing looks and behaves like one field.
    <div
      className={cn(
        'flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
        invalid && 'border-destructive ring-3 ring-destructive/20',
        disabled && 'opacity-50',
      )}
    >
      {tags.length > 0 && (
        // A real list: a screen reader announces "list, 3 items", so the
        // chips' number and content are clear without seeing them.
        <ul className="contents">
          {tags.map((tag, index) => (
            <li
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled}
                // The × alone means nothing to a screen reader; the label
                // says what it removes.
                aria-label={`Remove ${tag}`}
                className="rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={id}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-invalid={invalid}
        placeholder={placeholder}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
    </div>
  )
}