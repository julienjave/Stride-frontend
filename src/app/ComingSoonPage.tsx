import { Construction } from 'lucide-react'

interface ComingSoonPageProps {
  // The section's name, shown as the page heading, so the user can confirm
  // they landed where they meant to.
  title: string
}

// Destination for navigation sections that exist in the nav but not yet as
// features (Messages for everyone; the patient's Sessions and Team).
// Showing these tabs now keeps the navigation's shape stable as features
// ship — the same "visible, clearly labeled Coming soon" treatment the
// practitioner home's Messages slot already uses.
export function ComingSoonPage({ title }: ComingSoonPageProps) {
  return (
    <div className="mx-auto mt-12 max-w-sm space-y-3 px-4 text-center">
      <Construction
        className="mx-auto size-8 text-muted-foreground"
        aria-hidden="true"
      />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  )
}