import { createFileRoute } from '@tanstack/react-router';
import SyndicateCommitmentPage from '@/pages/syndicates/commit';

export const Route = createFileRoute('/syndicates/$slug/commit')({
  component: SyndicateCommitmentPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
