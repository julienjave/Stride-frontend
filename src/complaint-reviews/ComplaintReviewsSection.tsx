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

import { type FormEvent, type RefObject, useRef, useState } from 'react'
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
import { LoadError } from '@/common/LoadError'
import { ListSkeleton } from '@/common/Loading'
import { saveFile } from '@/common/saveFile'
import { useRetryFocus } from '@/common/useRetryFocus'
import { cn } from '@/lib/utils'
import { browserTimeZone, downloadFailureText, formatLinkMoment } from '@/records-export/recordsExportRules'
import {
  complaintReviewsQueryKey,
  downloadReviewCopy,
  endComplaintReview,
  listComplaintReviews,
  openComplaintReview,
} from './api'
import {
  CASE_REFERENCE_MAX_LENGTH,
  describeReview,
  fallbackFileName,
  openReviewBody,
  REASON_MAX_LENGTH,
  reasonError,
  REVIEW_DAYS,
  STATUS_LABELS,
} from './complaintReviewRules'
import type { ComplaintReviewSummary } from './types'

// The admin's "Complaint reviews" on a patient's user page (decisions §25,
// pass 2). A patient complains; the clinic needs to see what was done. Admins
// have no standing access to clinical data (decisions §16), so instead: ONE
// admin opens a review of ONE patient's record, with a reason, for 7 days. While
// it's open, that admin downloads the records export's PDF, stamped "Review
// copy" on every page — each copy recorded with what it held. The care team is
// told in their "For review" list (who, when, until — not why); the patient
// isn't told in the app (the person's choices).

interface ComplaintReviewsSectionProps {
  patientId: number
  firstName: string
  lastName: string
  // The signed-in admin: copies are only for the one who opened the review.
  myId: number
}

const GREEN_BOX = 'rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm'

export function ComplaintReviewsSection({
  patientId,
  firstName,
  lastName,
  myId,
}: ComplaintReviewsSectionProps) {
  const queryClient = useQueryClient()
  const reviews = useQuery({
    queryKey: complaintReviewsQueryKey(patientId),
    queryFn: () => listComplaintReviews(patientId),
  })
  // After a "Try again" that worked — and after ending a review, whose button
  // leaves the page — focus goes to the section's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('the complaint reviews', reviews.isSuccess)
  // What the last act did ("Review opened…", "Review ended…"). The status
  // element is ALWAYS in the page, so a screen reader announces each new
  // sentence: a live region added together with its text is often missed.
  const [note, setNote] = useState('')

  // Every change is answered by fetching the list again rather than patching
  // it by hand — the server knows the statuses. Also after a refusal (a 409
  // or 410 means the list on screen is out of date).
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: complaintReviewsQueryKey(patientId) })

  return (
    <section aria-labelledby="complaint-reviews-heading" className="space-y-3 rounded-lg border px-4 py-3">
      <h2
        ref={heading}
        tabIndex={-1}
        id="complaint-reviews-heading"
        className="text-sm font-medium outline-none"
      >
        Complaint reviews
      </h2>
      <p className="text-sm text-muted-foreground">
        When {firstName} makes a complaint, open a review to see what their record says: for{' '}
        {REVIEW_DAYS} days you can download copies of it — their medical file, programs and sessions
        — each one stamped and recorded. Their care team is told; {firstName} isn't told in the app.
      </p>
      <p role="status" className={note === '' ? 'sr-only' : GREEN_BOX}>
        {note}
      </p>

      <OpenReviewDialog
        patientId={patientId}
        name={`${firstName} ${lastName}`}
        firstName={firstName}
        onOpened={(review) => {
          setNote(
            `Review opened. You can download copies until ${formatLinkMoment(review.expiresAt)}.`,
          )
          void refresh()
        }}
      />

      {reviews.isError ? (
        <LoadError what="the complaint reviews" queries={[reviews]} />
      ) : !reviews.isSuccess ? (
        <ListSkeleton label="Loading the complaint reviews…" rows={2} />
      ) : reviews.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No review has been opened.</p>
      ) : (
        // Newest first, as the backend lists them.
        <ul aria-label="Complaint reviews" className="space-y-2">
          {reviews.data.map((review) => (
            <ReviewItem
              key={review.id}
              review={review}
              patientId={patientId}
              myId={myId}
              heading={heading}
              onNote={setNote}
              onChanged={() => void refresh()}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

// --- Opening a review --------------------------------------------------------

// A dialog with the form: the reason (required — accountability instead of
// approval only works if it says something) and the clinic's own case
// number, if any. It says, before anything happens, what opening one does and
// who will know.
function OpenReviewDialog({
  patientId,
  name,
  firstName,
  onOpened,
}: {
  patientId: number
  name: string
  firstName: string
  onOpened: (review: ComplaintReviewSummary) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [caseReference, setCaseReference] = useState('')
  // The reason's error shows only after a first try: an empty field the
  // admin hasn't reached yet is not a mistake.
  const [triedToSubmit, setTriedToSubmit] = useState(false)
  const reasonField = useRef<HTMLTextAreaElement>(null)

  function clearForm() {
    setReason('')
    setCaseReference('')
    setTriedToSubmit(false)
  }

  const open = useMutation({
    mutationFn: () => openComplaintReview(patientId, openReviewBody(reason, caseReference)),
    onSuccess: (review) => {
      setIsOpen(false)
      clearForm()
      onOpened(review)
    },
  })

  // Cancel, Escape and a click outside: the dialog always reopens empty.
  function changeOpen(next: boolean) {
    setIsOpen(next)
    if (!next) {
      clearForm()
      open.reset()
    }
  }

  const error = reasonError(reason)
  const showError = triedToSubmit && error !== null

  // A real <form>: Enter in the case reference submits, and the browser
  // treats it as one. preventDefault: the page must not reload.
  function submit(event: FormEvent) {
    event.preventDefault()
    setTriedToSubmit(true)
    if (error !== null) {
      reasonField.current?.focus()
      return
    }
    open.mutate()
  }

  const fieldId = (field: string) => `complaint-review-${field}-${patientId}`

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Open a review
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open a complaint review of {name}'s record?</DialogTitle>
          <DialogDescription>
            For {REVIEW_DAYS} days, you'll be able to download copies of {firstName}'s record, each
            stamped "Review copy" and recorded with what it held. {firstName}'s care team will see
            that you opened a review, and until when — not why. {firstName} isn't told in the app.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor={fieldId('reason')}>Reason</Label>
            <Textarea
              ref={reasonField}
              id={fieldId('reason')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={REASON_MAX_LENGTH}
              rows={3}
              required
              aria-invalid={showError}
              aria-describedby={cn(fieldId('reason-hint'), showError && fieldId('reason-error'))}
              placeholder="e.g. The patient says their knee got worse after the March program"
            />
            <p id={fieldId('reason-hint')} className="text-xs text-muted-foreground">
              Seen by the clinic's admins only, and printed on each copy.
            </p>
            {showError && (
              <p id={fieldId('reason-error')} className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor={fieldId('case')}>Case reference (optional)</Label>
            <Input
              id={fieldId('case')}
              value={caseReference}
              onChange={(e) => setCaseReference(e.target.value)}
              maxLength={CASE_REFERENCE_MAX_LENGTH}
              placeholder="e.g. CR-2026-14"
            />
          </div>
          {open.isError && (
            <p role="alert" className="text-sm text-destructive">
              {failureText(open.error)}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={open.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={open.isPending}>
              {open.isPending ? 'Opening…' : 'Open the review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- One review --------------------------------------------------------------

function ReviewItem({
  review,
  patientId,
  myId,
  heading,
  onNote,
  onChanged,
}: {
  review: ComplaintReviewSummary
  patientId: number
  myId: number
  heading: RefObject<HTMLHeadingElement | null>
  onNote: (note: string) => void
  onChanged: () => void
}) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  // Set when the confirmation closes BECAUSE the review ended — read by the
  // dialog's onCloseAutoFocus below. A ref, not state: it only steers where
  // focus goes, and must not cause a render of its own.
  const endedHere = useRef(false)
  const { opened, end, canCopy, copyNote } = describeReview(review, myId)

  // A copy: a MUTATION although it reads — it runs only when pressed, every
  // press is a new copy (recorded by the backend), and nothing is cached:
  // a health record shouldn't sit in the app's memory once saved. (The
  // patient's own "Download my records" works the same way.) A refusal may
  // mean the review ended meanwhile: the list is fetched again.
  const download = useMutation({
    mutationFn: () => downloadReviewCopy(patientId, review.id, browserTimeZone()),
    onSuccess: ({ blob, fileName }) => saveFile(blob, fileName ?? fallbackFileName(review.id)),
    onError: onChanged,
  })

  // Ending: confirmed first (it can't be undone — a new review needs a new
  // reason). On success the item's buttons leave the page with the status
  // change, so focus goes to the section's heading (onCloseAutoFocus, below)
  // and the status says what happened.
  const endReview = useMutation({
    mutationFn: () => endComplaintReview(patientId, review.id),
    onSuccess: () => {
      endedHere.current = true
      setIsConfirmOpen(false)
      onNote(`Review ${review.id} ended. No more copies can be made with it.`)
      onChanged()
    },
    onError: onChanged,
  })

  const isOpen = review.status === 'open'

  return (
    <li className={cn('space-y-1 text-sm', isOpen && 'rounded-lg border border-amber-600/40 bg-amber-500/10 p-3')}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Review {review.id}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
          {STATUS_LABELS[review.status]}
        </span>
      </p>
      <p className={isOpen ? undefined : 'text-muted-foreground'}>
        {opened} {end}
      </p>
      {/* As written: the line breaks the admin typed stay. */}
      <p className="whitespace-pre-wrap">
        <span className="font-medium">Reason: </span>
        {review.reason}
      </p>
      {review.caseReference !== null && (
        <p>
          <span className="font-medium">Case reference: </span>
          {review.caseReference}
        </p>
      )}
      {copyNote && <p className="text-muted-foreground">{copyNote}</p>}

      {isOpen && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {canCopy && (
            <Button
              size="sm"
              // Named with its review, starting with the visible words: two
              // open reviews would otherwise give two identical buttons.
              aria-label={`Download a review copy (review ${review.id})`}
              onClick={() => download.mutate()}
              disabled={download.isPending}
            >
              {download.isPending ? 'Preparing the copy…' : 'Download a review copy'}
            </Button>
          )}
          <Dialog
            open={isConfirmOpen}
            onOpenChange={(next) => {
              setIsConfirmOpen(next)
              if (next) endReview.reset()
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" aria-label={`End now (review ${review.id})`}>
                End now
              </Button>
            </DialogTrigger>
            <DialogContent
              // A closing dialog gives focus back to the button that opened
              // it — here "End now", which leaves the page once the review
              // has ended. So, in that case only, the default is cancelled
              // and focus goes to the section's heading. (Focusing the
              // heading in onSuccess wouldn't last: the dialog's own return
              // of focus runs after it.)
              onCloseAutoFocus={(event) => {
                if (!endedHere.current) return
                event.preventDefault()
                heading.current?.focus()
              }}
            >
              <DialogHeader>
                <DialogTitle>End review {review.id} now?</DialogTitle>
                <DialogDescription>
                  No more copies can be made with it. The copies already made stay recorded. To
                  look at the record again, open a new review, with its reason.
                </DialogDescription>
              </DialogHeader>
              {endReview.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {failureText(endReview.error)}
                </p>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={endReview.isPending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button onClick={() => endReview.mutate()} disabled={endReview.isPending}>
                  {endReview.isPending ? 'Ending…' : 'End the review'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* The file name says where to look: browsers save without asking. */}
      {download.isSuccess && (
        <p role="status" className="text-muted-foreground">
          Downloaded as {download.data.fileName ?? fallbackFileName(review.id)}. Look in your
          downloads. This copy is recorded.
        </p>
      )}
      {download.isError && (
        <p role="alert" className="text-destructive">
          {downloadFailureText(download.error)}
        </p>
      )}
    </li>
  )
}
