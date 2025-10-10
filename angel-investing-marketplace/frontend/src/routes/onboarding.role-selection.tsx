import { createFileRoute } from '@tanstack/react-router'
import { RoleSelectionPage } from '@/pages/onboarding/role-selection'

export const Route = createFileRoute('/onboarding/role-selection')({
  component: () => <RoleSelectionPage />,
})