// The bare /patient landing page. Same reasoning as PractitionerHomePage:
// deliberately minimal until Phase 4's actual patient-facing features
// (assigned programs, session flow) exist to link to. Its main job right
// now is simply to EXIST, so that DashboardRedirect has a real
// destination for patient accounts and nothing regresses for them.
export function PatientHomePage() {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Patient</h1>
    </div>
  )
}