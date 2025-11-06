import { createFileRoute } from '@tanstack/react-router'
import { NewsFeedPage } from '@/pages/social/news-feed'

export const Route = createFileRoute('/social/news-feed')({
  component: NewsFeedPage,
})
