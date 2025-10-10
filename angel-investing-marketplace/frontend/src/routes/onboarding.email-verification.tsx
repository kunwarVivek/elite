import { createFileRoute } from '@tanstack/react-router'
import { EmailVerificationPage } from '@/pages/onboarding/email-verification'

export const Route = createFileRoute('/onboarding/email-verification')({
  component: () => <EmailVerificationPage />,
})