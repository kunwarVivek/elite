import { createFileRoute } from '@tanstack/react-router'
import { NetworkPage } from '@/pages/social/network'

export const Route = createFileRoute('/social/network')({
  component: NetworkPage,
})
