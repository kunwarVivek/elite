import { createFileRoute } from '@tanstack/react-router';
import AccountSettingsPage from '@/pages/settings/account';

export const Route = createFileRoute('/settings/account')({
  component: AccountSettingsPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
