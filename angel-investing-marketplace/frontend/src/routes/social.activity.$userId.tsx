import { createFileRoute } from '@tanstack/react-router'
import { ActivityPage } from '@/pages/social/activity'

export const Route = createFileRoute('/social/activity/$userId')({
  component: ActivityPage,
})
