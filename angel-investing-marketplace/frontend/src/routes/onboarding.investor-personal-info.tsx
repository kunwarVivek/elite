import { createFileRoute } from '@tanstack/react-router'
import { InvestorPersonalInfoPage } from '@/pages/onboarding/investor-personal-info'

export const Route = createFileRoute('/onboarding/investor-personal-info')({
  component: () => <InvestorPersonalInfoPage />,
})