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

// The longest title a person may type — a template's and a program's alike.
// Mirrors the backend's TITLE_MAX_LENGTH (common/validators/title.ts), which
// both resources share since "Blank titles refused everywhere" (2026-10-14):
// assigning a template copies its title into the new program (the assign
// form prefills it), so the two limits must be one number — two constants
// that happened to be equal could drift, and a template's title would then
// open the assign form as "too long" before anyone typed.
export const TITLE_MAX_LENGTH = 200