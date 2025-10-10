import { createFileRoute } from '@tanstack/react-router'
import { CreatePitch } from '@/pages/pitches/create-pitch'

export const Route = createFileRoute('/pitches/create')({
  component: CreatePitch,
  beforeLoad: () => {
    // Check if user is authenticated and is a founder
    const token = localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('Authentication required')
    }
  },
})