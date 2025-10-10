import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding/')({
  beforeLoad: ({ location }) => {
    // Redirect to role selection as the default onboarding step
    throw redirect({
      to: '/onboarding/role-selection',
      replace: true,
    })
  },
})