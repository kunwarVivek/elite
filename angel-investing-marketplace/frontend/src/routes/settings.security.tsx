import { createFileRoute } from '@tanstack/react-router';
import SecuritySettingsPage from '@/pages/settings/security';

export const Route = createFileRoute('/settings/security')({
  component: SecuritySettingsPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
