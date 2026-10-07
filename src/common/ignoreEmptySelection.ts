// Radix's Select keeps a hidden native <select> in step with its \`value\`
// prop (it's there for browser form autofill). When \`value\` changes from a
// chosen option back to empty — a form reset after a successful submit —
// Radix fires a change event on that hidden element, and its handler reports
// the new, empty value through onValueChange, exactly as if the person had
// picked "nothing". Passed straight to react-hook-form, that echo of our own
// reset counts as a user change: the field is validated, and a just-cleared
// form shows "Select a clinic" / "Country is required" errors (found
// 2026-10-07, after creating a user).
//
// The dropdowns this wraps have no empty option, so a PERSON can never choose
// an empty value. An empty value can only be that echo, and it is ignored:
// the form already holds the cleared value it is echoing back.
export function ignoreEmptySelection(
  onChange: (value: string) => void,
): (value: string | undefined) => void {
  return (value) => {
    if (value) onChange(value)
  }
}