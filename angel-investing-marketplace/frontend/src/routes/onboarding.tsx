import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context, location }) => {
    // Redirect to role selection if no onboarding state exists
    // This would typically check for existing onboarding progress
  },
  component: () => <Outlet />,
})