import { createFileRoute } from '@tanstack/react-router'
import { PitchDashboard } from '@/pages/pitches/pitch-dashboard'

export const Route = createFileRoute('/pitches')({
  component: PitchDashboard,
  beforeLoad: () => {
    // Check if user is authenticated and is a founder
    const token = localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('Authentication required')
    }
  },
})