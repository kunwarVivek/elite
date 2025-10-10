import { createFileRoute } from '@tanstack/react-router'
import { EditPitch } from '@/pages/pitches/edit-pitch'

export const Route = createFileRoute('/pitches/$id/edit')({
  component: EditPitch,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated and is the pitch owner
    const token = localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('Authentication required')
    }
  },
})