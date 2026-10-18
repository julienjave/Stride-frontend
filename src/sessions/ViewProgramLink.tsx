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