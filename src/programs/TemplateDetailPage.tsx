import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { useProgram } from './useProgram'
import { canEditTemplate, isOwnTemplate } from './permissions'
import { YoursBadge } from '@/common/YoursBadge'
import { EditableTemplateTitle } from './EditableTemplateTitle'
import { EditableTemplateDescription } from './EditableTemplateDescription'
import { TemplateExerciseList } from './TemplateExerciseList'
import { DuplicateTemplateButton } from './DuplicateTemplateButton'
import { ArchiveTemplateButton } from './ArchiveTemplateButton'

// The ONE place a program template is viewed and managed: its title and
// description (inline-editable), its ordered exercise list (reorder,
// remove, add), and Duplicate/Delete. This replaced the old two-screen
// setup, where TemplateExercisesPage existed only because a template
// needs an id before exercises can be added to it — NewTemplatePage now
// creates the template and comes straight here instead.
//
// Deliberately separate from AssignedProgramDetailPage: templates and
// assigned programs are different enough entities (a template has no
// patient, no dates, no status) that they're expected to keep diverging.
export function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const templateId = Number(id)

  // Validated BEFORE any hook that needs the id runs — the outer/inner
  // component split (same as every other :id page in this app) is what
  // makes that possible without breaking the rules of hooks: this outer
  // component calls no data hooks at all, so returning early here is
  // fine, and the inner view always receives a real number.
  if (!id || Number.isNaN(templateId)) {
    return <p className="text-sm text-destructive">Invalid template.</p>
  }

  return <TemplateDetailView templateId={templateId} />
}

function TemplateDetailView({ templateId }: { templateId: number }) {
  const { data: template, isLoading, isError } = useProgram(templateId)
  const { data: currentUser } = useCurrentUser()

  if (isLoading) {
    return (
      <p className="mx-auto mt-12 max-w-2xl px-4 text-sm text-muted-foreground">
        Loading…
      </p>
    )
  }

  if (isError || !template) {
    return (
      <p className="mx-auto mt-12 max-w-2xl px-4 text-sm text-destructive">
        Couldn't load this template. Try refreshing.
      </p>
    )
  }

  // Computed ONCE, here, and handed down to every control — so the
  // whole page always agrees with itself about whether it's editable.
  const canEdit = canEditTemplate(template, currentUser)
  const isArchived = template.isArchived

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-6 px-4">
      {/* Reachable only by an old bookmark or deep browser history —
          nothing in the app links to an archived template anymore. The
          page still renders (what a deleted template contained is worth
          being able to look at), but read-only, and it says why. */}
      {isArchived && (
        <p
          role="status"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          This template has been deleted. You can still view it, but it
          can't be edited or duplicated.
        </p>
      )}

      <div className="space-y-4">
        <EditableTemplateTitle
          templateId={templateId}
          title={template.title}
          canEdit={canEdit}
          // Ownership, NOT canEdit: an archived template you created is
          // still yours, even though it's no longer editable. The badge
          // states a fact about who made it; canEdit is about what you
          // can do with it right now.
          adornment={
            isOwnTemplate(template, currentUser) ? <YoursBadge /> : null
          }
        />
        {/* Explains the ABSENCE of pencils on a colleague's template —
            otherwise a practitioner could reasonably wonder whether
            editing is broken. Not shown when archived: the notice above
            already explains that case. */}
        {!canEdit && !isArchived && (
          <p className="text-sm text-muted-foreground">
            View only — this template belongs to another practitioner.
            Duplicate it to make your own editable copy.
          </p>
        )}
        <EditableTemplateDescription
          templateId={templateId}
          description={template.description}
          canEdit={canEdit}
        />
      </div>

      {/* aria-labelledby turns this <section> into a named landmark
          ("Exercises") that assistive tech can jump straight to — and
          that tests can scope their queries to. */}
      <section aria-labelledby="template-exercises-heading" className="space-y-2">
        <h2 id="template-exercises-heading" className="text-lg font-medium">
          Exercises
        </h2>
        <TemplateExerciseList
          templateId={templateId}
          exercises={template.exercises}
          canEdit={canEdit}
        />
      </section>

      <div className="flex flex-wrap items-start gap-3">
        {/* Anyone who can see a live template can assign it — a colleague's
            too: assigning COPIES it, so their template never changes. Not
            an archived one (the backend refuses it, 400). The form opens
            with this template chosen. */}
        {!isArchived && (
          <Button asChild>
            <Link to={`/practitioner/programs/assigned/new?templateId=${templateId}`}>
              Assign to a patient
            </Link>
          </Button>
        )}
        {/* Everyone who can see a live template can duplicate it — only
            archived templates are off-limits (the backend refuses those
            too, with a 400). */}
        {!isArchived && <DuplicateTemplateButton templateId={templateId} />}
        {canEdit && (
          <ArchiveTemplateButton
            templateId={templateId}
            templateTitle={template.title}
          />
        )}
        <Button asChild variant="outline">
          <Link to="/practitioner/programs">Back</Link>
        </Button>
      </div>
    </div>
  )
}