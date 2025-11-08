import { createFileRoute } from '@tanstack/react-router';
import SpvDetailsPage from '@/pages/spv/details';

export const Route = createFileRoute('/spv/$slug')({
  component: SpvDetailsPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
