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