// Placeholder for the practitioner's clinic-scoped patient roster. The
// backend already fully supports this — POST /users role-gates
// practitioners to patients-only with a clinic-ownership check, and
// GET/PATCH /users/:id already allow a practitioner acting on a patient
// they manage via isPatientManagedBy. This is purely a missing
// frontend route/UI, per the roadmap's own note on this exact gap.
export function PatientsListPage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">My Patients (placeholder)</h1>
    </div>
  )
}