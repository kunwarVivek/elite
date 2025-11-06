import { createFileRoute } from '@tanstack/react-router'
import { ProfileEditPage } from '@/pages/social/profile-edit'

export const Route = createFileRoute('/social/profile/edit')({
  component: ProfileEditPage,
})
