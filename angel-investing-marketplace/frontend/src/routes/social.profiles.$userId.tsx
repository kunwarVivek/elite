import { createFileRoute } from '@tanstack/react-router'
import { ProfileViewPage } from '@/pages/social/profile-view'

export const Route = createFileRoute('/social/profiles/$userId')({
  component: ProfileViewPage,
})
