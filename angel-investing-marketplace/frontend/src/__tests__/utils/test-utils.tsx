import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthProvider } from '@/providers/AuthProvider';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider defaultTheme="light" storageKey="test-theme">
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override render method
export { customRender as render };

// Custom render for components that need specific providers
export const renderWithRouter = (
  ui: ReactElement,
  { route = '/' }: { route?: string } = {}
) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: AllTheProviders });
};

export const renderWithAuth = (
  ui: ReactElement,
  { user = null }: { user?: any } = {}
) => {
  // Mock authenticated user if provided
  if (user) {
    // This would need to be implemented based on your AuthProvider
    localStorage.setItem('auth-user', JSON.stringify(user));
  }

  return render(ui, { wrapper: AllTheProviders });
};

// Mock API client
export const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
};

// Mock WebSocket hook
export const mockWebSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'INVESTOR',
  avatar_url: 'https://example.com/avatar.jpg',
  is_verified: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createTestStartup = (overrides = {}) => ({
  id: 'startup-123',
  name: 'Test Startup Inc',
  slug: 'test-startup-inc',
  description: 'A test startup for testing purposes',
  industry: 'Technology',
  stage: 'MVP',
  funding_goal: 500000,
  current_funding: 150000,
  founder_id: 'user-123',
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestPitch = (overrides = {}) => ({
  id: 'pitch-123',
  startup_id: 'startup-123',
  title: 'Revolutionary SaaS Platform',
  summary: 'AI-powered platform transforming business operations',
  funding_amount: 500000,
  equity_offered: 10,
  minimum_investment: 10000,
  status: 'ACTIVE',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createTestInvestment = (overrides = {}) => ({
  id: 'investment-123',
  investor_id: 'user-123',
  pitch_id: 'pitch-123',
  amount: 25000,
  equity_percentage: 0.5,
  status: 'COMPLETED',
  investment_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Form testing helpers
export const fillFormField = async (fieldName: string, value: string) => {
  const input = screen.getByRole('textbox', { name: new RegExp(fieldName, 'i') });
  await userEvent.clear(input);
  await userEvent.type(input, value);
};

export const selectFromDropdown = async (selectName: string, optionText: string) => {
  const select = screen.getByRole('combobox', { name: new RegExp(selectName, 'i') });
  await userEvent.click(select);

  const option = screen.getByText(optionText);
  await userEvent.click(option);
};

export const submitForm = async (formTestId?: string) => {
  const submitButton = formTestId
    ? screen.getByTestId(formTestId)
    : screen.getByRole('button', { name: /submit|save|create/i });

  await userEvent.click(submitButton);
};

// Wait utilities
export const waitForLoadingToFinish = () =>
  screen.queryByTestId('loading-spinner') === null;

export const waitForElementToBeVisible = async (element: HTMLElement) => {
  await waitFor(() => {
    expect(element).toBeVisible();
  });
};

// Mock data generators
export const generateMockUsers = (count: number) =>
  Array.from({ length: count }, (_, i) => createTestUser({
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    name: `User ${i + 1}`,
  }));

export const generateMockStartups = (count: number) =>
  Array.from({ length: count }, (_, i) => createTestStartup({
    id: `startup-${i + 1}`,
    name: `Startup ${i + 1} Inc`,
    slug: `startup-${i + 1}-inc`,
  }));

export const generateMockPitches = (count: number) =>
  Array.from({ length: count }, (_, i) => createTestPitch({
    id: `pitch-${i + 1}`,
    title: `Investment Pitch ${i + 1}`,
  }));

// Accessibility testing helpers
export const expectAccessible = (container: HTMLElement) => {
  // Basic accessibility checks
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    expect(button).toHaveAttribute('type');
  });

  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    if (input.type !== 'hidden') {
      expect(input).toHaveAttribute('aria-label');
    }
  });
};

// Performance testing helpers
export const measureRenderTime = async (renderFunction: () => void) => {
  const start = performance.now();
  renderFunction();
  const end = performance.now();
  return end - start;
};

export const expectFastRender = async (renderFunction: () => void, maxTime = 100) => {
  const renderTime = await measureRenderTime(renderFunction);
  expect(renderTime).toBeLessThan(maxTime);
};