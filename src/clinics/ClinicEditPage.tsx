import { useParams, Link } from 'react-router'
import { useClinic } from './useClinic'
import { EditableClinicField } from './EditableClinicField'
import { DeactivateClinicButton } from './DeactivateClinicButton'
import {
  clinicNameSchema,
  clinicEmailSchema,
  clinicPhoneSchema,
  clinicAddressSchema,
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
    return <p className="text-sm text-destructive">Invalid clinic.</p>
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

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading clinic…</p>
  }

  if (isError || !clinic) {
    return <p className="text-sm text-destructive">Couldn't load this clinic.</p>
  }

  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{clinic.name}</h1>

      <div className="divide-y divide-border rounded-lg border px-4">
        <EditableClinicField
          clinicId={clinicId}
          fieldKey="name"
          label="Clinic name"
          value={clinic.name}
          schema={clinicNameSchema}
        />
        <EditableClinicField
          clinicId={clinicId}
          fieldKey="email"
          label="Clinic email"
          value={clinic.email}
          schema={clinicEmailSchema}
        />
        <EditableClinicField
          clinicId={clinicId}
          fieldKey="phone"
          label="Phone"
          value={clinic.phone}
          schema={clinicPhoneSchema}
        />
        <EditableClinicField
          clinicId={clinicId}
          fieldKey="address"
          label="Address"
          value={clinic.address}
          schema={clinicAddressSchema}
        />
        <EditableClinicField
          clinicId={clinicId}
          fieldKey="website"
          label="Website"
          value={clinic.website}
          schema={clinicWebsiteSchema}
        />
      </div>

      {/* No reactivate route exists yet (see deferred-improvements.md),
          so once a clinic is inactive, the Deactivate button simply
          isn't offered again — clicking DELETE /clinics/:id a second
          time would technically succeed (it's just another UPDATE to the
          same isActive: false), but there's nothing meaningful to
          confirm at that point, and showing the button would imply an
          action is available when it's really just a no-op. */}
      {clinic.isActive ? (
        <DeactivateClinicButton clinicId={clinicId} clinicName={clinic.name} />
      ) : (
        <p className="text-sm text-muted-foreground">This clinic is deactivated.</p>
      )}

      <p className="text-sm text-muted-foreground">
        <Link to="/admin/clinics" className="underline">
          Back to clinics
        </Link>
      </p>
    </div>
  )
}