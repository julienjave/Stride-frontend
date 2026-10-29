import { type FormEvent, type ReactNode, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { failureText } from '@/api/apiErrors'
import { localDateString } from '@/common/calendarDate'
import { formatCalendarDate } from '@/common/formatCalendarDate'
import { LoadError } from '@/common/LoadError'
import { ListSkeleton } from '@/common/Loading'
import { NativeSelect } from '@/common/NativeSelect'
import { saveFile } from '@/common/saveFile'
import { useRetryFocus } from '@/common/useRetryFocus'
import { cn } from '@/lib/utils'
import { browserTimeZone } from '@/records-export/recordsExportRules'
import { legalDisclosuresQueryKey, listLegalDisclosures, makeLegalDisclosure } from './api'
import {
  DISCLOSURE_PARTS,
  describeDisclosure,
  EMPTY_FORM,
  EXPLANATION_MAX_LENGTH,
  FALLBACK_FILE_NAME,
  formErrors,
  LEGAL_BASES,
  LEGAL_BASIS_LABELS,
  legalBasisText,
  makeBody,
  NAME_MAX_LENGTH,
  PART_LABELS,
  partsText,
  periodText,
  recipientText,
  REFERENCE_MAX_LENGTH,
  STATEMENT_MAX_LENGTH,
  type DisclosureForm,
  type FormField,
} from './legalDisclosureRules'
import type { DisclosurePart, LegalBasis, LegalDisclosureSummary } from './types'

// The admin's "Legal disclosures" on a patient's user page (decisions §25,
// pass 3). The law can require a clinic to give a record to someone outside
// it — a court, the police, a coroner — without the patient's approval. The
// admin records the order here (who receives it, under what, which parts,
// which period) and gets ONE PDF of exactly that, stamped "Disclosed to …" on
// every page. The patient finds it on My records ("Your record was shared")
// and in their own copy — unless an agency asked the clinic to hold it back
// for a time; the care team is told who received it.

interface LegalDisclosuresSectionProps {
  patientId: number
  firstName: string
  lastName: string
  // The signed-in admin: "Made by you".
  myId: number
}

const GREEN_BOX = 'rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm'

export function LegalDisclosuresSection({
  patientId,
  firstName,
  lastName,
  myId,
}: LegalDisclosuresSectionProps) {
  const queryClient = useQueryClient()
  const disclosures = useQuery({
    queryKey: legalDisclosuresQueryKey(patientId),
    queryFn: () => listLegalDisclosures(patientId),
  })
  // After a "Try again" that worked, focus goes to the section's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('the legal disclosures', disclosures.isSuccess)
  // What the last act did. ALWAYS in the page, so a screen reader announces
  // each new sentence (a live region added with its text is often missed).
  const [note, setNote] = useState('')

  return (
    <section
      aria-labelledby="legal-disclosures-heading"
      className="space-y-3 rounded-lg border px-4 py-3"
    >
      <h2
        ref={heading}
        tabIndex={-1}
        id="legal-disclosures-heading"
        className="text-sm font-medium outline-none"
      >
        Legal disclosures
      </h2>
      <p className="text-sm text-muted-foreground">
        When the law requires the clinic to give {firstName}'s record to someone outside it — a
        court order, a subpoena, a coroner — record it here. You get one copy of the parts the
        order covers, stamped on every page. {firstName} sees it on My records, unless an agency
        asks you to hold it back for a time; their care team is told who received it.
      </p>
      <p role="status" className={note === '' ? 'sr-only' : GREEN_BOX}>
        {note}
      </p>

      <MakeDisclosureDialog
        patientId={patientId}
        name={`${firstName} ${lastName}`}
        firstName={firstName}
        onMade={(fileName) => {
          setNote(
            `Disclosure recorded. Its copy was downloaded as ${fileName} — look in your downloads.`,
          )
          void queryClient.invalidateQueries({ queryKey: legalDisclosuresQueryKey(patientId) })
        }}
      />

      {disclosures.isError ? (
        <LoadError what="the legal disclosures" queries={[disclosures]} />
      ) : !disclosures.isSuccess ? (
        <ListSkeleton label="Loading the legal disclosures…" rows={2} />
      ) : disclosures.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No disclosure has been made.</p>
      ) : (
        // Newest first, as the backend lists them.
        <ul aria-label="Legal disclosures" className="space-y-2">
          {disclosures.data.map((disclosure) => (
            <DisclosureItem
              key={disclosure.id}
              disclosure={disclosure}
              myId={myId}
              firstName={firstName}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

// --- One disclosure ----------------------------------------------------------

function DisclosureItem({
  disclosure,
  myId,
  firstName,
}: {
  disclosure: LegalDisclosureSummary
  myId: number
  firstName: string
}) {
  const { made, hold } = describeDisclosure(disclosure, myId, firstName)
  const heldNow = !disclosure.shownToPatient
  return (
    <li
      className={cn(
        'space-y-1 rounded-lg border p-3 text-sm',
        heldNow && 'border-amber-600/40 bg-amber-500/10',
      )}
    >
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Disclosure {disclosure.id}</span>
        {heldNow && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Held back</span>
        )}
      </p>
      <Field label="Disclosed to">{recipientText(disclosure)}</Field>
      <Field label="Legal basis">
        {legalBasisText(disclosure.legalBasis, disclosure.basisExplanation)}
      </Field>
      {disclosure.orderReference !== null && (
        <Field label="Order reference">{disclosure.orderReference}</Field>
      )}
      <Field label="Request received on">{formatCalendarDate(disclosure.receivedOn)}</Field>
      <Field label="Parts">
        {partsText(disclosure.parts)} · {periodText(disclosure.periodFrom, disclosure.periodTo)}
      </Field>
      <p className="text-muted-foreground">{made}</p>
      {hold !== null && <p>{hold}</p>}
      {disclosure.withholdingStatement !== null && (
        // As written: the line breaks of the agency's statement stay.
        <p className="whitespace-pre-wrap">
          <span className="font-medium">Agency's statement: </span>
          {disclosure.withholdingStatement}
        </p>
      )}
    </li>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="font-medium">{label}: </span>
      {children}
    </p>
  )
}

// --- Recording a disclosure --------------------------------------------------

// A dialog with the order's form. It says, before anything happens, what
// recording one does — and recording IS the download: the copy is made in
// the same request, and there is no second copy (a second one is a second
// disclosure, with its own record).
function MakeDisclosureDialog({
  patientId,
  name,
  firstName,
  onMade,
}: {
  patientId: number
  name: string
  firstName: string
  onMade: (fileName: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<DisclosureForm>(EMPTY_FORM)
  // Errors show only after a first try: an empty field the admin hasn't
  // reached yet is not a mistake.
  const [triedToSubmit, setTriedToSubmit] = useState(false)
  // Each field that can be wrong, to move focus to the first one.
  const fields = useRef<Partial<Record<FormField, HTMLElement | null>>>({})

  const set = <K extends keyof DisclosureForm>(key: K, value: DisclosureForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const make = useMutation({
    mutationFn: () => makeLegalDisclosure(patientId, makeBody(form, browserTimeZone())),
    onSuccess: ({ blob, fileName }) => {
      const savedAs = fileName ?? FALLBACK_FILE_NAME
      saveFile(blob, savedAs)
      setIsOpen(false)
      setForm(EMPTY_FORM)
      setTriedToSubmit(false)
      onMade(savedAs)
    },
  })

  // Cancel, Escape and a click outside: the dialog always reopens empty.
  function changeOpen(next: boolean) {
    setIsOpen(next)
    if (!next) {
      setForm(EMPTY_FORM)
      setTriedToSubmit(false)
      make.reset()
    }
  }

  const errors = formErrors(form, localDateString())
  const shown = triedToSubmit ? errors : {}

  function submit(event: FormEvent) {
    event.preventDefault()
    setTriedToSubmit(true)
    // The first field in error, in the form's order (formErrors fills them
    // in that order, and objects keep their insertion order).
    const first = Object.keys(errors)[0] as FormField | undefined
    if (first !== undefined) {
      fields.current[first]?.focus()
      return
    }
    make.mutate()
  }

  const id = (field: string) => `legal-disclosure-${field}-${patientId}`
  // An input's accessibility wiring: its hint, its error, "invalid".
  const described = (field: FormField, hint?: boolean) => ({
    'aria-invalid': shown[field] !== undefined,
    'aria-describedby':
      cn(hint && id(`${field}-hint`), shown[field] !== undefined && id(`${field}-error`)) ||
      undefined,
  })
  const errorOf = (field: FormField) =>
    shown[field] !== undefined && (
      <p id={id(`${field}-error`)} className="text-sm text-destructive">
        {shown[field]}
      </p>
    )
  const ref = (field: FormField) => (element: HTMLElement | null) => {
    fields.current[field] = element
  }

  function togglePart(part: DisclosurePart, checked: boolean) {
    set('parts', checked ? [...form.parts, part] : form.parts.filter((each) => each !== part))
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Record a disclosure
        </Button>
      </DialogTrigger>
      {/* A long form: the dialog scrolls inside the screen's height (a
          phone's included) instead of running off it. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a legal disclosure of {name}'s record</DialogTitle>
          <DialogDescription>
            Only when the law requires it. Recording it downloads ONE copy of the parts and the
            period you choose, stamped on every page — there is no second copy. {firstName} will
            see who received it, why, when and what, on My records. Their care team will see that
            you made it, and who received it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor={id('recipientName')}>Recipient's name</Label>
            <Input
              ref={ref('recipientName')}
              id={id('recipientName')}
              value={form.recipientName}
              onChange={(e) => set('recipientName', e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              required
              placeholder="e.g. Det. Jane Roe"
              {...described('recipientName')}
            />
            {errorOf('recipientName')}
          </div>
          <div className="space-y-1">
            <Label htmlFor={id('organisation')}>Organisation (optional)</Label>
            <Input
              id={id('organisation')}
              value={form.recipientOrganisation}
              onChange={(e) => set('recipientOrganisation', e.target.value)}
              maxLength={NAME_MAX_LENGTH}
              placeholder="e.g. Montreal Police"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={id('legalBasis')}>Legal basis</Label>
            <NativeSelect
              ref={ref('legalBasis')}
              id={id('legalBasis')}
              value={form.legalBasis}
              onChange={(e) => set('legalBasis', e.target.value as LegalBasis | '')}
              required
              {...described('legalBasis')}
            >
              <option value="">Choose one…</option>
              {LEGAL_BASES.map((basis) => (
                <option key={basis} value={basis}>
                  {LEGAL_BASIS_LABELS[basis]}
                </option>
              ))}
            </NativeSelect>
            {errorOf('legalBasis')}
          </div>
          {form.legalBasis === 'other' && (
            <div className="space-y-1">
              <Label htmlFor={id('basisExplanation')}>Explain the legal basis</Label>
              <Textarea
                ref={ref('basisExplanation')}
                id={id('basisExplanation')}
                value={form.basisExplanation}
                onChange={(e) => set('basisExplanation', e.target.value)}
                maxLength={EXPLANATION_MAX_LENGTH}
                rows={2}
                required
                placeholder="e.g. A tribunal's production order"
                {...described('basisExplanation')}
              />
              {errorOf('basisExplanation')}
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor={id('reference')}>Order reference (optional)</Label>
            <Input
              id={id('reference')}
              value={form.orderReference}
              onChange={(e) => set('orderReference', e.target.value)}
              maxLength={REFERENCE_MAX_LENGTH}
              placeholder="e.g. 500-17-123456-261"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={id('receivedOn')}>Request received on</Label>
            <Input
              ref={ref('receivedOn')}
              id={id('receivedOn')}
              type="date"
              value={form.receivedOn}
              onChange={(e) => set('receivedOn', e.target.value)}
              required
              {...described('receivedOn')}
            />
            {errorOf('receivedOn')}
          </div>

          <fieldset className="space-y-1" {...described('parts', true)}>
            <legend className="text-sm font-medium">Parts of the record</legend>
            <p id={id('parts-hint')} className="text-xs text-muted-foreground">
              Only what the order covers. Messages leave the app only this way.
            </p>
            {DISCLOSURE_PARTS.map((part, index) => (
              <label key={part} className="flex items-center gap-2 text-sm">
                <input
                  // Focus goes to the first box when no part is chosen.
                  ref={index === 0 ? ref('parts') : undefined}
                  type="checkbox"
                  checked={form.parts.includes(part)}
                  onChange={(e) => togglePart(part, e.target.checked)}
                />
                {PART_LABELS[part]}
              </label>
            ))}
            {errorOf('parts')}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Period (optional)</legend>
            <p id={id('period-hint')} className="text-xs text-muted-foreground">
              Each part by its own date: a note by the day it was written, a session by its day, a
              message by the day it was sent, a program if its dates overlap. Leave a side empty
              for no limit.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={id('periodFrom')}>From</Label>
                <Input
                  id={id('periodFrom')}
                  type="date"
                  value={form.periodFrom}
                  onChange={(e) => set('periodFrom', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={id('periodTo')}>To</Label>
                <Input
                  ref={ref('periodTo')}
                  id={id('periodTo')}
                  type="date"
                  value={form.periodTo}
                  onChange={(e) => set('periodTo', e.target.value)}
                  {...described('periodTo')}
                />
              </div>
            </div>
            {errorOf('periodTo')}
          </fieldset>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.hold}
                onChange={(e) => set('hold', e.target.checked)}
              />
              <span>
                Hold it back from {firstName} for a time — only when law enforcement or a health
                oversight agency asks, with a statement saying why.
              </span>
            </label>
            {form.hold && (
              <>
                <div className="space-y-1">
                  <Label htmlFor={id('withheldUntil')}>{firstName} sees it from</Label>
                  <Input
                    ref={ref('withheldUntil')}
                    id={id('withheldUntil')}
                    type="date"
                    value={form.withheldUntil}
                    onChange={(e) => set('withheldUntil', e.target.value)}
                    required
                    {...described('withheldUntil')}
                  />
                  {errorOf('withheldUntil')}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={id('withholdingStatement')}>The agency's statement</Label>
                  <Textarea
                    ref={ref('withholdingStatement')}
                    id={id('withholdingStatement')}
                    value={form.withholdingStatement}
                    onChange={(e) => set('withholdingStatement', e.target.value)}
                    maxLength={STATEMENT_MAX_LENGTH}
                    rows={3}
                    required
                    placeholder="e.g. Telling the patient now would impede an ongoing investigation (letter of Oct 27)"
                    {...described('withholdingStatement')}
                  />
                  {errorOf('withholdingStatement')}
                </div>
              </>
            )}
          </div>

          {make.isError && (
            <p role="alert" className="text-sm text-destructive">
              {failureText(make.error)}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={make.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={make.isPending}>
              {make.isPending ? 'Preparing the copy…' : 'Record and download'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
