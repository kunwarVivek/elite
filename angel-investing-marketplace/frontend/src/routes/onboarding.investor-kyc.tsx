import { createFileRoute } from '@tanstack/react-router'
import { InvestorKycPage } from '@/pages/onboarding/investor-kyc'

export const Route = createFileRoute('/onboarding/investor-kyc')({
  component: () => <InvestorKycPage />,
})