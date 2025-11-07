import { createFileRoute } from '@tanstack/react-router';
import SyndicatePaymentPage from '@/pages/syndicates/payment';

export const Route = createFileRoute('/syndicates/$slug/payment')({
  component: SyndicatePaymentPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
