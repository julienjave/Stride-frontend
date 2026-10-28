import { useParams, Link } from 'react-router'
import { useClinic } from './useClinic'
import { EditableField } from '@/common/EditableField'
import { EditableAddress } from '@/common/address/EditableAddress'
import { RecordLoadFailed, RecordNotFound } from '@/common/RecordNotFound'
import { requiredValue } from '@/common/requiredValue'
import { useRetryFocus } from '@/common/useRetryFocus'
import { useSaveClinic } from './useSaveClinic'
import { DeactivateClinicButton } from './DeactivateClinicButton'
import { ReactivateClinicButton } from './ReactivateClinicButton'
import { ClinicLogoUpload } from './ClinicLogoUpload'
import {
  clinicNameSchema,
  clinicEmailSchema,
  clinicPhoneSchema,
  clinicWebsiteSchema,
} from './schemas'
import { Loading } from '@/common/Loading'

export function ClinicEditPage() {
  const { id } = useParams<{ id: string }>()
  const clinicId = Number(id)

  // A route param is always a string (or undefined, if this component
  // somehow rendered outside its intended /admin/clinics/:id route) —
  // Number() on a non-numeric string produces NaN rather than throwing,
  // so this guard is what stands in for "the URL was malformed" instead
  // of silently calling useClinic(NaN) and letting it fail confusingly
  // further down.
  // (Since 2026-10-28 it says so like a 404 does: RecordNotFound.)
  if (!id || Number.isNaN(clinicId)) {
    return <RecordNotFound noun="clinic" links={WAYS_OUT} />
  }

  return <ClinicEditView clinicId={clinicId} />
}

// Where to go when this page can't show its clinic (RecordNotFound).
const WAYS_OUT: [{ to: string; label: string }] = [{ to: '/admin/clinics', label: 'Clinics' }]

// Split out from ClinicEditPage specifically so useClinic() is only ever
// called with a confirmed-valid number — keeping the "is this URL even
// valid" check and the "fetch and render" logic as two separate concerns,
// rather than one component juggling both an invalid-id early return AND
// a hook call that would need a fallback id (like 0) to satisfy React's
// rule against calling hooks conditionally.
function ClinicEditView({ clinicId }: { clinicId: number }) {
  const clinicQuery = useClinic(clinicId)
  const { data: clinic, isLoading } = clinicQuery
  // After a "Try again" that worked, focus goes to the clinic's name.
  const heading = useRetryFocus<HTMLHeadingElement>('this clinic', clinicQuery.isSuccess)
  // What "saving" means for every field below: PATCH /clinics/:id, then
  // update the clinic caches. Each field wraps it in its own mutation.
  const saveClinic = useSaveClinic(clinicId)

  if (isLoading) {
    return <Loading label="Loading the clinic…" className="mx-auto mt-12 max-w-sm px-4" />
  }

  // A 404: "Clinic not found" (clinics are deactivated, never deleted — so a
  // wrong address); anything else: the load error.
  if (clinicQuery.isError || !clinic) {
    return <RecordLoadFailed queries={[clinicQuery]} what="this clinic" noun="clinic" links={WAYS_OUT} />
  }

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4 px-4">
      <h1 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
        {clinic.name}
      </h1>

      <ClinicLogoUpload clinicId={clinicId} logoUrl={clinic.logoUrl} />

      <div className="divide-y divide-border rounded-lg border px-4">
        {/* name and email can't be emptied: their schemas reject '', so
            EditableField shows "… is required" instead of saving — and
            requiredValue() makes that assumption explicit. */}
        <EditableField
          label="Clinic name"
          value={clinic.name}
          schema={clinicNameSchema}
          save={(value) => saveClinic({ name: requiredValue(value) })}
        />
        <EditableField
          label="Clinic email"
          value={clinic.email}
          schema={clinicEmailSchema}
          save={(value) => saveClinic({ email: requiredValue(value) })}
        />
        <EditableField
          label="Phone"
          value={clinic.phone}
          schema={clinicPhoneSchema}
          inputType="tel"
          save={(value) => saveClinic({ phone: value })}
        />
        {/* The address block the profile page uses. It saves all six
            parts at once — the clinic's address used to be settable only
            at creation time. */}
        <EditableAddress address={clinic} save={(address) => saveClinic(address)} />
        <EditableField
          label="Website"
          value={clinic.website}
          schema={clinicWebsiteSchema}
          save={(value) => saveClinic({ website: value })}
        />
      </div>

      {/* A real reactivate path now exists (see ReactivateClinicButton),
          mirroring what was built for users. */}
      {clinic.isActive ? (
        <DeactivateClinicButton clinicId={clinicId} clinicName={clinic.name} />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">This clinic is deactivated.</p>
          <ReactivateClinicButton clinicId={clinicId} clinicName={clinic.name} />
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Link to="/admin/clinics" className="underline">
          Back to clinics
        </Link>
      </p>
    </div>
  )
}