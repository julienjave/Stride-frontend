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
import { Plus } from 'lucide-react'

// Always the FIRST card in the grid (see ExerciseLibraryPage), regardless
// of search/filter/page — creating a new exercise should always be one
// click away, not something that could scroll out of view or disappear
// depending on what's currently filtered.
export function AddExerciseCard() {
  return (
    <Link
      to="/practitioner/library/new"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-muted-foreground hover:bg-muted/50"
    >
      <div className="flex h-24 items-center justify-center">
        <Plus className="h-8 w-8" aria-hidden="true" />
      </div>
      <span className="text-sm font-medium">Add New Exercise</span>
    </Link>
  )
}