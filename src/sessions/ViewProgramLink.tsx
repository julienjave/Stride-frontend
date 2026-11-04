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

import { Link } from 'react-router'
import type { AssignedProgram } from '@/assigned-programs/types'
import { programPagePath } from './programPagePath'

// "View program" under a program's card — on the home and the hub. Named
// with the program (the visible words first): several cards, several links.
export function ViewProgramLink({ program }: { program: Pick<AssignedProgram, 'id' | 'title'> }) {
  return (
    <Link
      to={programPagePath(program.id)}
      aria-label={`View program: ${program.title}`}
      className="inline-block text-sm underline underline-offset-4"
    >
      View program
    </Link>
  )
}