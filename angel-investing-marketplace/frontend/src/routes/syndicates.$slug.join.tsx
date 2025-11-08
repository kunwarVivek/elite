import { createFileRoute } from '@tanstack/react-router';
import JoinSyndicatePage from '@/pages/syndicates/join';

export const Route = createFileRoute('/syndicates/$slug/join')({
  component: JoinSyndicatePage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
