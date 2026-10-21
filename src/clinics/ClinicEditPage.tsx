import { useParams, Link } from 'react-router'
import { useClinic } from './useClinic'
import { EditableField } from '@/common/EditableField'
import { EditableAddress } from '@/common/address/EditableAddress'
import { requiredValue } from '@/common/requiredValue'
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

export function ClinicEditPage() {
  const { id } = useParams<{ id: string }>()
  const clinicId = Number(id)

  // A route param is always a string (or undefined, if this component
  // somehow rendered outside its intended /admin/clinics/:id route) —
  // Number() on a non-numeric string produces NaN rather than throwing,
  // so this guard is what stands in for "the URL was malformed" instead
  // of silently calling useClinic(NaN) and letting it fail confusingly
  // further down.
  if (!id || Number.isNaN(clinicId)) {
    return <p className="mx-auto mt-12 max-w-sm px-4 text-sm text-destructive">Invalid clinic.</p>
  }

  return <ClinicEditView clinicId={clinicId} />
}

// Split out from ClinicEditPage specifically so useClinic() is only ever
// called with a confirmed-valid number — keeping the "is this URL even
// valid" check and the "fetch and render" logic as two separate concerns,
// rather than one component juggling both an invalid-id early return AND
// a hook call that would need a fallback id (like 0) to satisfy React's
// rule against calling hooks conditionally.
function ClinicEditView({ clinicId }: { clinicId: number }) {
  const { data: clinic, isLoading, isError } = useClinic(clinicId)
  // What "saving" means for every field below: PATCH /clinics/:id, then
  // update the clinic caches. Each field wraps it in its own mutation.
  const saveClinic = useSaveClinic(clinicId)

  if (isLoading) {
    return <p className="mx-auto mt-12 max-w-sm px-4 text-sm text-muted-foreground">Loading clinic…</p>
  }

  if (isError || !clinic) {
    return <p className="mx-auto mt-12 max-w-sm px-4 text-sm text-destructive">Couldn't load this clinic.</p>
  }

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4 px-4">
      <h1 className="text-xl font-semibold">{clinic.name}</h1>

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