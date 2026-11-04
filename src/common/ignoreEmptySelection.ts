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