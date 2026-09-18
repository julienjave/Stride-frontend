import { useParams, Link } from 'react-router'
import { useClinic } from './useClinic'
import { EditableClinicField } from './EditableClinicField'
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

      <ClinicLogoUpload clinicId={clinicId} logoUrl={clinic.logoUrl} />

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
        {/* Editing an existing address is deliberately NOT here yet.
            EditableClinicField's single-line-per-field pattern doesn't
            fit a 6-field address (line1/line2/city/state/postal/country)
            — that needs its own multi-field block component with the
            same country-dropdown/cascading-state behavior the CREATE
            form uses. That's real work, and it naturally belongs with
            the Phase 3/4 profile-editing items already on the roadmap
            (which need the exact same reusable address block), not a
            one-off patch bolted on here. Until then, a clinic's address
            can be set at creation time but not edited afterward through
            this page. */}
        <EditableClinicField
          clinicId={clinicId}
          fieldKey="website"
          label="Website"
          value={clinic.website}
          schema={clinicWebsiteSchema}
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