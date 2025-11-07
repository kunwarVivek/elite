import { createFileRoute } from '@tanstack/react-router';
import ProfileSettingsPage from '@/pages/settings/profile';

export const Route = createFileRoute('/settings/profile')({
  component: ProfileSettingsPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
