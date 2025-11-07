import { createFileRoute } from '@tanstack/react-router';
import PaymentMethodsPage from '@/pages/settings/payment-methods';

export const Route = createFileRoute('/settings/payment-methods')({
  component: PaymentMethodsPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
});
