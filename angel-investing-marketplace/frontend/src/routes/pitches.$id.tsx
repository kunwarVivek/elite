import { createFileRoute } from '@tanstack/react-router'
import { PitchDetail } from '@/pages/pitches/pitch-detail'

export const Route = createFileRoute('/pitches/$id')({
  component: PitchDetail,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('Authentication required')
    }
  },
})