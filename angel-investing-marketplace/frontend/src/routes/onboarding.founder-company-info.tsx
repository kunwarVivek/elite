import { createFileRoute } from '@tanstack/react-router'
import { FounderCompanyInfoPage } from '@/pages/onboarding/founder-company-info'

export const Route = createFileRoute('/onboarding/founder-company-info')({
  component: () => <FounderCompanyInfoPage />,
})