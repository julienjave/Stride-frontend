import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrentUser } from '@/auth/useCurrentUser'
import { LoadError } from '@/common/LoadError'
import { ShowHiddenToggle } from '@/common/ShowHiddenToggle'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useUsers } from '@/users/useUsers'
import { OtherClinicsKey } from './ClinicBadges'
import { PatientIdentity } from './PatientIdentity'
import { ALL_CLINICS, filterByClinic, showsOtherClinic, splitByAccount } from './roster'
import type { User } from '@/users/types'
import { ListSkeleton } from '@/common/Loading'

// "My patients" (/practitioner/patients) — the patients whose care team I'm
// on (decisions §3: the roster IS my care-team links, nothing separate).
//
// The data is GET /users: for a practitioner, the backend answers with
// exactly that list (UsersService.findPatientsForPractitioner), so this
// page reuses the admin's useUsers() hook and its cache entry rather than a
// second hook for the same request. Safe because the cache is cleared when
// the active role changes (Phase 1): Morgan-as-admin's "every user" list
// can never be shown to Morgan-as-practitioner.
//
// Adding someone happens on its own page (AddPatientPage: search first,
// then invite) — this page only lists, filters and leads there.
//
// DEACTIVATED patients (decisions §22, 2026-10-27): still on my care team,
// so asked for too (`includeInactive` — its own cache entry, the admin
// list's key with `true`), but kept under the active list behind "Show N
// deactivated patients" — off on every visit, like every such switch in the
// app (ShowHiddenToggle), and marked on their rows.
export function PatientsListPage() {
  const { data: currentUser } = useCurrentUser()
  const patientsQuery = useUsers(true)
  const { data: patients, isLoading, isError } = patientsQuery
  // After a "Try again" that worked, focus goes to the page's heading.
  const heading = useRetryFocus<HTMLHeadingElement>('your patients', patientsQuery.isSuccess)
  const [clinicFilter, setClinicFilter] = useState(ALL_CLINICS)
  const [showDeactivated, setShowDeactivated] = useState(false)


  // `?? []` while /auth/me isn't there (in practice it always is — the
  // route guard waited for it): no clinics means no filter.
  const myClinics = currentUser?.clinics ?? []
  // Their ids, for the badges: a clinic outside this list is drawn as "not
  // one of yours" (roadmap Phase 6.5, "Roster badges").
  const myClinicIds = myClinics.map((clinic) => clinic.id)

  // The filter only appears for a practitioner working in two clinics or
  // more: with one, it could only ever offer "all" and that one clinic —
  // the same list twice.
  const showClinicFilter = myClinics.length >= 2

  // Derived at render time from the cached list and the filter — never
  // stored in state. A copy in state would need updating every time the
  // list refetches (after a join, say) and could fall out of step; a value
  // computed from its sources can't. (Sorting a few dozen names on each
  // render costs nothing measurable.)
  const { active: visiblePatients, deactivated } = splitByAccount(
    filterByClinic(patients ?? [], clinicFilter),
  )
  const hasActive = patients?.some((patient) => patient.isActive) ?? false

  const chosenClinic = myClinics.find((clinic) => String(clinic.id) === clinicFilter)

  // The key explaining the dashed badges, only when one is ON SCREEN: the
  // active rows always, the deactivated ones only while they're shown.
  const showKey = showsOtherClinic(
    showDeactivated ? [...visiblePatients, ...deactivated] : visiblePatients,
    myClinicIds,
  )

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-4 px-4">
      <div className="flex items-center justify-between gap-3">
        <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          My patients
        </h1>
        <Button asChild>
          <Link to="/practitioner/patients/add">Add patient</Link>
        </Button>
      </div>

      {showClinicFilter && (
        <div className="flex items-center gap-2">
          <span id="clinic-filter-label" className="text-sm text-muted-foreground">
            Clinic
          </span>
          {/* A Radix Select like the app's other dropdowns. No empty
              option and no form reset here, so none of the
              ignoreEmptySelection precautions the create-user form needs. */}
          <Select value={clinicFilter} onValueChange={setClinicFilter}>
            <SelectTrigger aria-labelledby="clinic-filter-label" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CLINICS}>All my clinics</SelectItem>
              {myClinics.map((clinic) => (
                <SelectItem key={clinic.id} value={String(clinic.id)}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading && <ListSkeleton label="Loading your patients…" avatar />}

      {isError && <LoadError what="your patients" queries={[patientsQuery]} />}

      {/* Two different empty states, because they mean different things:
          no patients AT ALL (say what the list is and how to fill it), or
          none at the chosen clinic (the filter hid them — say so). */}
      {patients && patients.length === 0 && (
        <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium">No patients yet</p>
          <p className="text-sm text-muted-foreground">
            Patients appear here once you're on their care team: find someone already in your
            clinic, or invite a new patient.
          </p>
          <Button asChild variant="outline">
            <Link to="/practitioner/patients/add">Add patient</Link>
          </Button>
        </div>
      )}

      {/* Patients, but no ACTIVE one: every one of them is deactivated —
          not "No patients yet", which would be untrue (the switch below
          says how many). */}
      {patients && patients.length > 0 && !hasActive && (
        <p className="text-sm text-muted-foreground">None of your patients has an active account.</p>
      )}

      {hasActive && visiblePatients.length === 0 && (
        <p className="text-sm text-muted-foreground">
          None of your patients attend {chosenClinic?.name ?? 'this clinic'}.
        </p>
      )}

      {visiblePatients.length > 0 && (
        <PatientRows label="Patients" patients={visiblePatients} myClinicIds={myClinicIds} />
      )}

      <ShowHiddenToggle
        count={deactivated.length}
        singular="deactivated patient"
        plural="deactivated patients"
        checked={showDeactivated}
        onChange={setShowDeactivated}
      />
      {showDeactivated && deactivated.length > 0 && (
        <PatientRows
          label="Deactivated patients"
          patients={deactivated}
          myClinicIds={myClinicIds}
        />
      )}

      {/* Once, under the lists, rather than on every row: the badges say it
          to screen readers themselves; this tells everyone else what the
          dashed outline means. */}
      {showKey && <OtherClinicsKey />}
    </div>
  )
}

// One list of patient rows. Named (aria-label): with two lists on the page,
// a screen reader announces WHICH one it's entering — the patient page's
// program lists do the same.
function PatientRows({
  label,
  patients,
  myClinicIds,
}: {
  label: string
  patients: User[]
  myClinicIds: readonly number[]
}) {
  return (
    <ul aria-label={label} className="divide-y divide-border rounded-lg border">
      {patients.map((patient) => (
        <li key={patient.id}>
          {/* The whole row is the link to the patient's page — a big
              target, easy to hit on a phone. */}
          <Link
            to={`/practitioner/patients/${patient.id}`}
            className="block space-y-1 px-4 py-3 hover:bg-muted/50"
          >
            <PatientIdentity
              userId={patient.id}
              firstName={patient.firstName}
              lastName={patient.lastName}
              avatarUrl={patient.avatarUrl}
              dateOfBirth={patient.patientProfile?.dateOfBirth ?? null}
              // ALL of the patient's clinics, including ones I don't
              // work at (decided 2026-10-08): on my care team I have
              // clinical access anyway, and "Robin is also seen at
              // Harbour" is useful to whoever treats Robin. The
              // directory search stays at the clinics we share — its
              // patients aren't mine, and it shows only what finding
              // them needs (decisions §3, directory level). The ones I
              // don't work at are marked (`myClinicIds`, Phase 6.5).
              clinics={patient.clinics}
              myClinicIds={myClinicIds}
            />
            {/* Words, not only a greyed row: the state must be readable
                (and read out) without relying on colour. */}
            {!patient.isActive && (
              <span className="block text-xs text-muted-foreground">Account deactivated</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}