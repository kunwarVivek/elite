import { createFileRoute } from '@tanstack/react-router'
import { TrendingPage } from '@/pages/social/trending'

export const Route = createFileRoute('/social/trending')({
  component: TrendingPage,
})
