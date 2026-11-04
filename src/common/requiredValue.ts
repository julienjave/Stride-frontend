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

// For fields whose database column is NOT NULL (a name, a clinic's email,
// a license number…), used inside an EditableField's `save`:
//
//   save={(value) => saveUser({ firstName: requiredValue(value) })}
//
// EditableField hands every `save` a `string | null`, because in general
// a cleared field is saved as null. For a required field that can't
// actually happen: its schema rejects '', so EditableField shows
// "… is required" and never gets as far as saving. But TypeScript can't
// know that — the guarantee lives in the schema, at runtime.
//
// Rather than hiding the gap (a cast like `value as string`, or a silent
// `value ?? ''`), this states the assumption and makes it LOUD: if it's
// ever broken (say, someone passes a schema that accepts ''), the save
// fails with a clear message instead of quietly sending null — or an
// empty name — to the backend.
export function requiredValue(value: string | null): string {
  if (value === null) {
    throw new Error('This field is required and cannot be cleared')
  }
  return value
}