import { createFileRoute } from '@tanstack/react-router'
import { PitchAnalyticsPage } from '@/pages/pitches/pitch-analytics'

export const Route = createFileRoute('/pitches/$id/analytics')({
  component: PitchAnalyticsPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated and is the pitch owner or admin
    const token = localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('Authentication required')
    }
  },
})