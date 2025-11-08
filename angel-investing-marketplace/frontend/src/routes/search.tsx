import { createFileRoute } from '@tanstack/react-router';
import GlobalSearchPage from '@/pages/search';

export const Route = createFileRoute('/search')({
  component: GlobalSearchPage,
  beforeLoad: ({ params }) => {
    // Check if user is authenticated
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('Authentication required');
    }
  },
  validateSearch: (search: Record<string, unknown>) => {
    // Validate search params
    return {
      q: (search.q as string) || '',
    };
  },
});
