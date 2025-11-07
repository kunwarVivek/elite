import { createFileRoute } from '@tanstack/react-router';
import SpvDashboardPage from '@/pages/spv/dashboard';

export const Route = createFileRoute('/spv/dashboard')({
  component: SpvDashboardPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
