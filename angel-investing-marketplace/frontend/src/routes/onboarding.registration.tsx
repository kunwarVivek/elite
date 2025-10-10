import { createFileRoute } from '@tanstack/react-router'
import { RegistrationPage } from '@/pages/onboarding/registration'

export const Route = createFileRoute('/onboarding/registration')({
  component: () => <RegistrationPage />,
})