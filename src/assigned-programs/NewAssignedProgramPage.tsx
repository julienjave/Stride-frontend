import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '@/api/client'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/common/NativeSelect'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { formatShortDate, isCalendarDate, localDateString } from '@/common/calendarDate'
import { workoutLabel, workoutLetter } from '@/common/workoutLabel'
import { PROGRAM_STATUS_LABELS } from '@/patients/patientPageRules'
import { sortByName } from '@/patients/roster'
import { isOwnTemplate } from '@/programs/permissions'
import { usePrograms } from '@/programs/usePrograms'
import { useProgram } from '@/programs/useProgram'
import type { ProgramTemplate } from '@/programs/types'
import type { User } from '@/users/types'
import { useUsers } from '@/users/useUsers'
import {
  MAX_DURATION_WEEKS,
  assignFormSchema,
  plannedEndDate,
  suggestTitle,
  templateProblem,
  toCreateInput,
  type AssignFormValues,
  type EndMode,
} from './assignForm'
import { describeDraft } from './describeSchedule'
import { nextMonday, programWeekRange } from './programDates'
import { ScheduleFields, type ScheduleWorkoutOption } from './ScheduleFields'
import {
  draftFromVersion,
  emptyScheduleDraft,
  forgetWorkoutChoices,
  type ScheduleDraft,
} from './scheduleDraft'
import type { AssignedProgramDetail } from './types'
import { useAssignedProgram } from './useAssignedProgram'
import { useCreateAssignedProgram } from './useCreateAssignedProgram'

// "Assign a program" — /practitioner/programs/assigned/new. ONE page for the
// whole assignment (decisions §5, "Settled 2026-10-10", point 5): patient,
// template, title, dates, schedule. Tailoring the exercises happens after,
// on the program's own page — no wizard holding an unsaved copy of the
// exercise list.
//
// Four ways in, told apart by the query string:
//   ?templateId=1        — "Assign to a patient" on a template's page;
//   ?patientId=6         — "Assign a program" on a patient's page (the
//                          patient is then fixed, shown as text);
//   ?basedOnProgramId=12 — "Assign again" on a completed or cancelled
//                          program's page (3a-2): the source is that program
//                          — its workouts and tailored exercises are copied —
//                          and the patient is its patient;
//   nothing              — "+ Assign a program" on the Programs page.
export function NewAssignedProgramPage() {
  const [searchParams] = useSearchParams()
  const continuedId = searchParams.get('basedOnProgramId')
  // Only CHOOSES which page to show — it calls no hook of its own. Hooks
  // must run in the same order on every render (React matches them by
  // position), so an early return BEFORE them would break as soon as the
  // query string switched modes on the same page. Two components = two
  // separate hook lists, and switching mounts the other one fresh.
  return continuedId !== null ? (
    <AssignAgainPage continuedId={continuedId} />
  ) : (
    <AssignFromTemplatePage
      requestedPatientId={searchParams.get('patientId')}
      requestedTemplateId={searchParams.get('templateId')}
    />
  )
}

// The usual way in: a template as the source.
function AssignFromTemplatePage({
  requestedPatientId,
  requestedTemplateId,
}: {
  requestedPatientId: string | null
  requestedTemplateId: string | null
}) {
  // As a practitioner, GET /users answers MY patients (my care-team links)
  // — exactly who I may assign a program to. The same cached list the
  // roster uses.
  const patientsQuery = useUsers()
  // GET /programs: every live (not archived) template, mine and my
  // colleagues' — a colleague's template is a fine starting point (it's
  // copied, so assigning never changes their template).
  const templatesQuery = usePrograms()

  return (
    <div className="mx-auto mt-8 max-w-xl space-y-6 px-4 pb-12">
      <h1 className="text-xl font-semibold">Assign a program</h1>
      {patientsQuery.isLoading || templatesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : patientsQuery.isError || templatesQuery.isError ? (
        <p className="text-sm text-destructive">
          Couldn't load your patients and templates. Try refreshing.
        </p>
      ) : (
        // The form is created only once both lists are here, because
        // react-hook-form reads its defaultValues ONCE, at creation: a
        // preselected template's title must be known by then.
        <AssignProgramForm
          patients={patientsQuery.data ?? []}
          templates={templatesQuery.data ?? []}
          requestedPatientId={requestedPatientId}
          requestedTemplateId={requestedTemplateId}
        />
      )}
    </div>
  )
}

// "Assign again" — /practitioner/programs/assigned/new?basedOnProgramId=12.
// Loads the program to continue and my patients, checks it CAN be continued
// (the backend's rules, said before the form is filled in), then shows the
// same form with that program as the source. Its own component, because it
// asks different questions first than the template form.
function AssignAgainPage({ continuedId }: { continuedId: string }) {
  const id = Number(continuedId)
  const isValidId = Number.isInteger(id) && id > 0
  const patientsQuery = useUsers()
  const sourceQuery = useAssignedProgram(id, { enabled: isValidId })
  const source = sourceQuery.data

  // Why it can't be assigned again, or null. Only a COMPLETED or CANCELLED
  // program may be continued (an active one is still running — the backend
  // answers 409; a deleted one had nothing happen in it — 400), and only for
  // its own patient, who must be one of mine (the form can't change them).
  let refusal: string | null = null
  if (!isValidId) refusal = "That link doesn't name a program."
  else if (sourceQuery.isError) {
    refusal =
      "That program can't be found — it doesn't exist, or it belongs to a patient whose care team you're not on."
  } else if (source?.isArchived) {
    refusal = 'That program was deleted before any session, so there is nothing to continue.'
  } else if (source && source.status === 'active') {
    refusal =
      'That program is still running: complete or cancel it first, then assign it again.'
  } else if (source && patientsQuery.data && !patientsQuery.data.some((p) => p.id === source.patientId)) {
    refusal = "That program's patient isn't one of your patients any more, so you can't continue it."
  }

  return (
    <div className="mx-auto mt-8 max-w-xl space-y-6 px-4 pb-12">
      <h1 className="text-xl font-semibold">Assign again</h1>
      {refusal ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{refusal}</p>
          {isValidId && !sourceQuery.isError && (
            <Link to={`/practitioner/programs/assigned/${id}`} className="text-sm underline">
              Back to the program
            </Link>
          )}
        </div>
      ) : patientsQuery.isLoading || !source ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : patientsQuery.isError ? (
        <p className="text-sm text-destructive">Couldn't load your patients. Try refreshing.</p>
      ) : (
        // As for templates: the form only once its data is here (its
        // defaultValues are read once — the title and schedule come from
        // the program).
        <AssignProgramForm
          patients={patientsQuery.data ?? []}
          templates={[]}
          requestedPatientId={String(source.patientId)}
          requestedTemplateId={null}
          continued={source}
        />
      )}
    </div>
  )
}

interface AssignProgramFormProps {
  patients: User[]
  templates: ProgramTemplate[]
  requestedPatientId: string | null
  requestedTemplateId: string | null
  // "Assign again": the closed program this one continues — the source,
  // instead of a template.
  continued?: AssignedProgramDetail
}

// The schedule the continued program had last — the one to start from, as
// "go on as before" is the likely intent. A pause isn't a schedule to go on
// with: the latest version that isn't one. None at all → a new draft.
function lastScheduleDraft(program: AssignedProgramDetail): ScheduleDraft {
  const last = [...program.schedules].reverse().find((version) => version.type !== 'paused')
  if (!last) return emptyScheduleDraft()
  // Its workouts by POSITION (the new program's workouts don't exist yet):
  // the program's order — the order they're copied in.
  const ordered = [...program.workouts].sort((a, b) => a.sortOrder - b.sortOrder)
  const positions = new Map(ordered.map((workout, position) => [workout.id, position]))
  return draftFromVersion(
    last,
    (workoutId) => positions.get(workoutId) ?? null,
    ordered.map((_, position) => position),
  )
}

function AssignProgramForm({
  patients,
  templates,
  requestedPatientId,
  requestedTemplateId,
  continued,
}: AssignProgramFormProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: currentUser } = useCurrentUser()

  // A patient named in the address bar is FIXED (shown as text) — but only
  // if they're one of my patients. Anyone else (not on my care team any
  // more, a mistyped link) gets a note and the normal choice: the backend
  // would refuse them anyway (403).
  const fixedPatient = patients.find((patient) => String(patient.id) === requestedPatientId)
  const preselectedTemplate = templates.find(
    (template) => String(template.id) === requestedTemplateId,
  )

  const form = useForm<AssignFormValues>({
    resolver: zodResolver(assignFormSchema),
    defaultValues: {
      patientId: fixedPatient ? String(fixedPatient.id) : '',
      templateId: preselectedTemplate ? String(preselectedTemplate.id) : '',
      basedOnProgramId: continued ? String(continued.id) : '',
      title: continued?.title ?? preselectedTemplate?.title ?? '',
      // The viewer's own today (not UTC's): the patient's first day.
      startDate: localDateString(),
      endMode: 'none',
      durationWeeks: '',
      endDate: '',
      schedule: continued ? lastScheduleDraft(continued) : emptyScheduleDraft(),
    },
  })
  const errors = form.formState.errors

  // useWatch re-renders this component when these fields change — the
  // hints, the end date preview and the summary are computed from them.
  const [templateId, startDate, endMode, durationWeeks, endDate, schedule] = useWatch({
    control: form.control,
    name: ['templateId', 'startDate', 'endMode', 'durationWeeks', 'endDate', 'schedule'],
  })

  // The chosen template IN FULL — the list has no workouts, and the
  // schedule needs them. Not requested until a template is chosen.
  // (Never when continuing a program: its template field stays empty.)
  const templateQuery = useProgram(Number(templateId), { enabled: templateId !== '' })
  const template = templateQuery.data
  // The source the new program is copied from: the continued program, or
  // the chosen template. Both carry `workouts` and `exercises` in the same
  // shape, which is all the rest of the form reads.
  const source = continued ?? template
  const problem = continued
    ? templateProblem(continued, 'program')
    : template
      ? templateProblem(template)
      : null

  // The source's workouts as the schedule editor's options. When
  // assigning, a workout is named by its POSITION (0 = A): the program's
  // own workouts don't exist yet (see scheduleDraft.ts).
  const workoutOptions: ScheduleWorkoutOption[] = source
    ? [...source.workouts]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((workout, position) => ({
          ref: position,
          letter: workoutLetter(position),
          label: workoutLabel(position, workout.name),
        }))
    : []

  const createMutation = useCreateAssignedProgram((program) => {
    // `replace`: the program page takes the form's place in the history, so
    // Back from the new program doesn't reopen a filled-in form whose
    // program already exists (a second click would assign it twice).
    void navigate(`/practitioner/programs/assigned/${program.id}`, { replace: true })
  })

  function submit(values: AssignFormValues) {
    // The schedule needs the source's workouts, and a source the backend
    // would refuse is already explained on screen: nothing to send.
    if (!source || problem) return
    createMutation.mutate(toCreateInput(values, source.workouts.length))
  }

  // Cancel goes back where the practitioner came from (the template, the
  // patient, the Programs page). location.key is 'default' when this page
  // was the FIRST entry of the history (a typed URL, a new tab): going back
  // would leave the app, so the Programs page instead.
  function cancel() {
    if (location.key === 'default') void navigate('/practitioner/programs')
    else void navigate(-1)
  }

  const endPreview = plannedEndDate({ startDate, endMode, durationWeeks, endDate })
  const summary = source && !problem ? scheduleSummary() : null

  // The schedule in words, from exactly what will be sent (describeDraft).
  function scheduleSummary(): string | null {
    return describeDraft(
      schedule,
      workoutOptions.map((option) => option.ref),
      workoutLetter,
      isCalendarDate(startDate) ? startDate : undefined,
    )
  }

  const today = localDateString()
  const monday = nextMonday(today)

  return (
    <form
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      className="space-y-6"
      noValidate
    >
      {/* --- WHO --------------------------------------------------------- */}
      {fixedPatient ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Patient</p>
          <p>
            {patientLabel(fixedPatient)}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {requestedPatientId && (
            <p className="text-sm text-muted-foreground">
              That patient isn't one of your patients, so you can't assign them a program. Choose
              one of yours below.
            </p>
          )}
          <Label htmlFor="patientId">Patient</Label>
          <NativeSelect
            id="patientId"
            aria-invalid={!!errors.patientId}
            {...form.register('patientId')}
          >
            <option value="">Choose a patient</option>
            {sortByName(patients).map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patientLabel(patient)}
              </option>
            ))}
          </NativeSelect>
          {patients.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You have no patients yet. Add one from{' '}
              <Link to="/practitioner/patients" className="underline">
                My patients
              </Link>
              .
            </p>
          )}
          {errors.patientId && (
            <p className="text-sm text-destructive">{errors.patientId.message}</p>
          )}
        </div>
      )}

      {/* --- WHAT -------------------------------------------------------- */}
      {continued ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Continues</p>
          <p>
            {continued.title}
            {continued.endDate && (
              <span className="text-muted-foreground">
                {' '}
                ({PROGRAM_STATUS_LABELS[continued.status].toLowerCase()}, ended{' '}
                {formatCalendarDate(continued.endDate)})
              </span>
            )}
          </p>
          {problem && <p className="text-sm text-destructive">{problem}</p>}
          {!problem && workoutOptions.length > 1 && (
            <p className="text-sm text-muted-foreground">
              Workouts: {workoutOptions.map((option) => option.label).join(', ')}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Its workouts and exercises, as tailored for this patient, are copied into the new
            program. The schedule starts as it was last — change it if needed.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="templateId">Template</Label>
          <Controller
            control={form.control}
            name="templateId"
            render={({ field }) => (
              <NativeSelect
                id="templateId"
                aria-invalid={!!errors.templateId || !!problem}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(event) => {
                  // Choosing another template changes two OTHER fields, which
                  // is why this is a Controller with its own onChange rather
                  // than a plain register(): the title follows the template
                  // (unless typed by hand), and the previous template's
                  // workout choices no longer mean anything.
                  const previous = templates.find((t) => String(t.id) === field.value)
                  const next = templates.find((t) => String(t.id) === event.target.value)
                  field.onChange(event.target.value)
                  if (next) {
                    form.setValue(
                      'title',
                      suggestTitle(form.getValues('title'), previous?.title ?? null, next.title),
                    )
                  }
                  form.setValue('schedule', forgetWorkoutChoices(form.getValues('schedule')))
                }}
              >
                <option value="">Choose a template</option>
                {templates.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                    {currentUser && isOwnTemplate(option, currentUser) ? ' (yours)' : ''}
                  </option>
                ))}
              </NativeSelect>
            )}
          />
          {errors.templateId && (
            <p className="text-sm text-destructive">{errors.templateId.message}</p>
          )}
          {templateQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading the template…</p>
          )}
          {templateQuery.isError && (
            <p className="text-sm text-destructive">Couldn't load this template. Try again.</p>
          )}
          {problem && <p className="text-sm text-destructive">{problem}</p>}
          {template && !problem && workoutOptions.length > 1 && (
            <p className="text-sm text-muted-foreground">
              Workouts: {workoutOptions.map((option) => option.label).join(', ')}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Its exercises are copied into the patient's program: you can tailor them there
            afterwards, and later changes to the template won't affect it.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          autoComplete="off"
          aria-invalid={!!errors.title}
          {...form.register('title')}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      {/* --- WHEN -------------------------------------------------------- */}
      <div className="space-y-1">
        <Label htmlFor="startDate">Start date</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="startDate"
            type="date"
            className="w-auto"
            aria-invalid={!!errors.startDate}
            {...form.register('startDate')}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => form.setValue('startDate', monday, { shouldValidate: true })}
          >
            Start next Monday ({formatShortDate(monday)})
          </Button>
        </div>
        {errors.startDate && (
          <p className="text-sm text-destructive">{errors.startDate.message}</p>
        )}
        {/* Only for "N a week", the one schedule that counts in program
            weeks (decisions §5, point 6) — "Specific days" have no weeks to
            explain. */}
        {schedule.type === 'times_per_week' && isCalendarDate(startDate) && (
          <p className="text-sm text-muted-foreground">
            Weeks will run {programWeekRange(startDate)}.
          </p>
        )}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">End</legend>
        {(
          [
            ['none', 'No end date'],
            ['weeks', 'After a number of weeks'],
            ['date', 'On a date'],
          ] as [EndMode, string][]
        ).map(([mode, label]) => (
          <label key={mode} className="flex items-center gap-2 text-sm">
            <input type="radio" value={mode} {...form.register('endMode')} />
            {label}
          </label>
        ))}
        {endMode === 'none' && (
          <p className="text-sm text-muted-foreground">
            The program runs until you complete or cancel it.
          </p>
        )}
        {endMode === 'weeks' && (
          <div className="space-y-1">
            <Label htmlFor="durationWeeks">Number of weeks</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="durationWeeks"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_DURATION_WEEKS}
                className="w-24"
                aria-invalid={!!errors.durationWeeks}
                {...form.register('durationWeeks')}
              />
              {endPreview && (
                <span className="text-sm text-muted-foreground">
                  Ends {formatShortDate(endPreview)}
                </span>
              )}
            </div>
            {errors.durationWeeks && (
              <p className="text-sm text-destructive">{errors.durationWeeks.message}</p>
            )}
          </div>
        )}
        {endMode === 'date' && (
          <div className="space-y-1">
            <Label htmlFor="endDate">End date</Label>
            <Input
              id="endDate"
              type="date"
              className="w-auto"
              min={isCalendarDate(startDate) ? startDate : undefined}
              aria-invalid={!!errors.endDate}
              {...form.register('endDate')}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive">{errors.endDate.message}</p>
            )}
          </div>
        )}
      </fieldset>

      {/* --- HOW OFTEN ---------------------------------------------------- */}
      {source && !problem ? (
        <Controller
          control={form.control}
          name="schedule"
          render={({ field }) => (
            <ScheduleFields
              value={field.value}
              onChange={field.onChange}
              workouts={workoutOptions}
              error={errors.schedule?.message}
            />
          )}
        />
      ) : (
        <div className="space-y-1">
          <p className="text-sm font-medium">Schedule</p>
          <p className="text-sm text-muted-foreground">
            Choose a template first: the schedule says which of its workouts the patient does on
            each day.
          </p>
        </div>
      )}

      {summary && (
        <p className="text-sm">
          <span className="text-muted-foreground">Schedule:</span> {summary}
        </p>
      )}

      {createMutation.isError && (
        // role="alert": announced by screen readers as soon as it appears.
        // The backend's own words: they say what was refused and why.
        <div role="alert" className="space-y-1 text-sm text-destructive">
          {createMutation.error instanceof ApiError ? (
            createMutation.error.messages.map((message) => <p key={message}>{message}</p>)
          ) : (
            <p>Couldn't assign the program. Check your connection and try again.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Assigning…' : 'Assign program'}
        </Button>
        <Button type="button" variant="outline" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// "Pat Lee · born 12 April 1988" — the date of birth tells two patients
// with the same name apart, which matters most exactly here: assigning a
// program to the wrong person. (Patient identification in health care uses
// two identifiers for that reason.)
function patientLabel(patient: User): string {
  const name = `${patient.firstName} ${patient.lastName}`
  const born = patient.patientProfile?.dateOfBirth
  return born ? `${name} · born ${formatCalendarDate(born)}` : name
}