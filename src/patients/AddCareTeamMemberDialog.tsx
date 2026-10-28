import { useState } from 'react'
import { failureText } from '@/api/apiErrors'
import { LoadError } from '@/common/LoadError'
import { UserAvatar } from '@/common/UserAvatar'
import { useRetryFocus } from '@/common/useRetryFocus'
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
import { cn } from '@/lib/utils'
import { localDateString } from '@/common/calendarDate'
import { filterCandidates } from './patientPageRules'
import { useAddCareTeamMember } from './useCareTeamChange'
import { useCareTeamCandidates } from './useCareTeamCandidates'

// The backend's limit (AddCareTeamMemberDto: @MaxLength(255)).
const REASON_MAX_LENGTH = 255

interface AddCareTeamMemberDialogProps {
  patientId: number
  patientFirstName: string
  // "Add a colleague" (a practitioner) or "Add someone" (an admin, who is
  // not adding a colleague of their own). The button AND the title.
  label: string
}

// Adds a practitioner to a patient's care team (decided 2026-10-09): pick
// one of the practitioners working at THE PATIENT's clinics, optionally say
// why and until when. Used on the practitioner's patient page and on the
// admin's user page — the backend applies the same rule to both.
//
// The list is a group of RADIO BUTTONS — native inputs inside a <fieldset>
// with a <legend>: exactly one choice, arrow keys move between options, and
// a screen reader announces "Practitioner, radio group, 1 of 4". Building
// that from clickable divs would mean re-creating all of it by hand.
export function AddCareTeamMemberDialog({
  patientId,
  patientFirstName,
  label,
}: AddCareTeamMemberDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [until, setUntil] = useState('')

  function clearForm() {
    setFilter('')
    setSelectedId(null)
    setReason('')
    setUntil('')
  }

  // Fetched only while the dialog is open.
  const candidates = useCareTeamCandidates(patientId, isOpen)
  // After a "Try again" of the list that worked, focus goes to the dialog's
  // title (the list itself has no heading; focus stays inside the dialog).
  const title = useRetryFocus<HTMLHeadingElement>('the practitioners', candidates.isSuccess)
  // On success: close and clear — but NOT reset the mutation, which is
  // still finishing at that point (it would be resetting itself mid-way).
  // Its state is "success" afterwards, so reopening shows no old error.
  const addMutation = useAddCareTeamMember(patientId, () => {
    setIsOpen(false)
    clearForm()
  })

  // Cancel, Escape and a click outside go through here: the dialog always
  // reopens empty — no previous choice, text, date or error.
  function changeOpen(open: boolean) {
    setIsOpen(open)
    if (!open) {
      clearForm()
      addMutation.reset()
    }
  }

  function add() {
    if (selectedId === null) return
    addMutation.mutate({ practitionerId: selectedId, reason, until })
  }

  const visible = candidates.data ? filterCandidates(candidates.data, filter) : []
  const fieldId = (name: string) => `care-team-${name}-${patientId}`

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle ref={title} tabIndex={-1} className="outline-none">
            {label} to {patientFirstName}'s care team
          </DialogTitle>
          <DialogDescription>
            They'll get access to {patientFirstName}'s clinical record: programs, sessions,
            medical files and messages. This is recorded, and {patientFirstName} can see who is on
            their care team.
          </DialogDescription>
        </DialogHeader>

        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or specialty…"
          aria-label="Filter by name or specialty"
        />

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Practitioner</legend>
          {candidates.isLoading && (
            <p className="text-sm text-muted-foreground">Loading practitioners…</p>
          )}
          {candidates.isError && <LoadError what="the practitioners" queries={[candidates]} />}
          {candidates.data && candidates.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No practitioner works at {patientFirstName}'s clinics.
            </p>
          )}
          {candidates.data && candidates.data.length > 0 && visible.length === 0 && (
            <p className="text-sm text-muted-foreground">No practitioner matches "{filter.trim()}".</p>
          )}
          {visible.length > 0 && (
            // Scrolls inside the dialog when the list is long, so the
            // reason, date and buttons stay reachable on a phone.
            <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border">
              {visible.map((candidate) => (
                <li key={candidate.id}>
                  <label
                    className={cn(
                      'flex items-center gap-3 px-3 py-2',
                      candidate.onCareTeam ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="radio"
                      name={fieldId('candidate')}
                      value={candidate.id}
                      checked={selectedId === candidate.id}
                      onChange={() => setSelectedId(candidate.id)}
                      // On the team already: adding again would be a 409.
                      disabled={candidate.onCareTeam}
                    />
                    <UserAvatar
                      firstName={candidate.firstName}
                      lastName={candidate.lastName}
                      avatarUrl={candidate.avatarUrl}
                      className="size-8 text-xs"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {candidate.firstName} {candidate.lastName}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[
                          candidate.specialties.join(', '),
                          candidate.sharedClinics.map((clinic) => clinic.name).join(', '),
                          candidate.onCareTeam ? 'Already on the team' : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="space-y-1">
          <Label htmlFor={fieldId('reason')}>Reason (optional)</Label>
          <Textarea
            id={fieldId('reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX_LENGTH}
            placeholder="e.g. Covering Mondays, or second opinion"
            rows={2}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={fieldId('until')}>Until (optional)</Label>
          <Input
            id={fieldId('until')}
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            // Today at the earliest: the link ends at the END of the chosen
            // day (endOfLocalDay), and the backend refuses an end in the
            // past. The browser's date picker greys out earlier days.
            min={localDateString()}
          />
          <p className="text-xs text-muted-foreground">
            For planned cover: their access ends after this day. Leave empty for no end date.
          </p>
        </div>

        {addMutation.isError && (
          <p className="text-sm text-destructive">
            {failureText(addMutation.error)}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={addMutation.isPending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={add} disabled={selectedId === null || addMutation.isPending}>
            {addMutation.isPending ? 'Adding…' : 'Add to care team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}