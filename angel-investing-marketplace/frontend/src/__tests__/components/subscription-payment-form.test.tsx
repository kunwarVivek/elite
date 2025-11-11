/**
 * Subscription PaymentForm Component Tests
 *
 * Tests for Stripe Elements integration in subscription payment flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/test-utils';
import { PaymentForm } from '../../components/subscription/PaymentForm';

// Mock Stripe.js
const mockConfirmSetup = vi.fn();
const mockElements = {
  getElement: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mockStripe = {
  elements: vi.fn(() => mockElements),
  confirmSetup: mockConfirmSetup,
  confirmCardSetup: vi.fn(),
};

// Mock @stripe/react-stripe-js
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <div data-testid="card-element">Card Element</div>,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
}));

// Mock subscription API
const mockCreateSetupIntent = vi.fn();
const mockCreateSubscription = vi.fn();

vi.mock('../../lib/subscription-api', () => ({
  subscriptionApi: {
    createSetupIntent: mockCreateSetupIntent,
    createSubscription: mockCreateSubscription,
  },
}));

describe('PaymentForm - Subscription', () => {
  const defaultProps = {
    planId: 'plan_pro',
    planName: 'Pro Plan',
    price: 29,
    billingInterval: 'monthly' as const,
    trialDays: 14,
    onSuccess: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSetupIntent.mockResolvedValue({
      clientSecret: 'seti_test_secret_123',
      setupIntentId: 'seti_test_123',
    });
    mockConfirmSetup.mockResolvedValue({
      setupIntent: {
        id: 'seti_test_123',
        status: 'succeeded',
        payment_method: 'pm_test_123',
      },
      error: null,
    });
    mockCreateSubscription.mockResolvedValue({
      id: 'sub_test_123',
      status: 'trialing',
      planId: 'plan_pro',
    });
  });

  describe('Rendering', () => {
    it('should render payment form with Stripe Elements', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByTestId('stripe-elements')).toBeInTheDocument();
      expect(screen.getByTestId('card-element')).toBeInTheDocument();
    });

    it('should display plan information', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText('Pro Plan')).toBeInTheDocument();
      expect(screen.getByText(/\$29/i)).toBeInTheDocument();
      expect(screen.getByText(/monthly/i)).toBeInTheDocument();
    });

    it('should display trial information when trial is available', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText(/14-day free trial/i)).toBeInTheDocument();
      expect(screen.getByText(/you won't be charged until/i)).toBeInTheDocument();
    });

    it('should not display trial information when trial is 0', () => {
      render(<PaymentForm {...defaultProps} trialDays={0} />);

      expect(screen.queryByText(/free trial/i)).not.toBeInTheDocument();
    });

    it('should display security badges', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText(/secure payment/i)).toBeInTheDocument();
      expect(screen.getByText(/PCI compliant/i)).toBeInTheDocument();
      expect(screen.getByText(/SSL encrypted/i)).toBeInTheDocument();
    });

    it('should display submit button', () => {
      render(<PaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Setup Intent Creation', () => {
    it('should create setup intent on component mount', async () => {
      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });
    });

    it('should handle setup intent creation errors', async () => {
      const mockError = new Error('Failed to create setup intent');
      mockCreateSetupIntent.mockRejectedValue(mockError);

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to initialize payment/i)).toBeInTheDocument();
      });
    });

    it('should retry setup intent creation on retry button click', async () => {
      const user = userEvent.setup();
      mockCreateSetupIntent.mockRejectedValueOnce(new Error('Network error')).mockResolvedValue({
        clientSecret: 'seti_retry_secret',
        setupIntentId: 'seti_retry',
      });

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to initialize payment/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit payment form with valid card details', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue({ /* mock card element */ });

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockConfirmSetup).toHaveBeenCalled();
        expect(mockCreateSubscription).toHaveBeenCalledWith({
          planId: 'plan_pro',
          paymentMethodId: 'pm_test_123',
        });
        expect(defaultProps.onSuccess).toHaveBeenCalledWith({
          id: 'sub_test_123',
          status: 'trialing',
          planId: 'plan_pro',
        });
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue({ /* mock card element */ });

      // Delay the confirmSetup to keep button in loading state
      mockConfirmSetup.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  setupIntent: { id: 'seti_test', status: 'succeeded', payment_method: 'pm_test' },
                  error: null,
                }),
              100
            )
          )
      );

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      // Button should be disabled and show loading text
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('should not allow submission without Stripe instance', async () => {
      const user = userEvent.setup();

      // Mock useStripe to return null
      const { useStripe } = await import('@stripe/react-stripe-js');
      vi.mocked(useStripe).mockReturnValue(null);

      render(<PaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      expect(submitButton).toBeDisabled();
    });

    it('should not allow submission without card element', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue(null);

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          expect.stringContaining('Payment form not ready')
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe confirmation errors', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue({ /* mock card element */ });

      mockConfirmSetup.mockResolvedValue({
        setupIntent: null,
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined',
        },
      });

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/your card was declined/i)).toBeInTheDocument();
        expect(defaultProps.onError).toHaveBeenCalledWith('Your card was declined');
      });
    });

    it('should handle subscription creation errors', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue({ /* mock card element */ });

      mockCreateSubscription.mockRejectedValue(new Error('Subscription creation failed'));

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/subscription creation failed/i)).toBeInTheDocument();
        expect(defaultProps.onError).toHaveBeenCalled();
      });
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue({ /* mock card element */ });

      mockConfirmSetup.mockRejectedValue(new Error('Network error'));

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should clear error message on retry', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue({ /* mock card element */ });

      mockConfirmSetup
        .mockResolvedValueOnce({
          setupIntent: null,
          error: { message: 'Card declined' },
        })
        .mockResolvedValueOnce({
          setupIntent: { id: 'seti_test', status: 'succeeded', payment_method: 'pm_test' },
          error: null,
        });

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      // First attempt - fails
      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/card declined/i)).toBeInTheDocument();
      });

      // Second attempt - succeeds
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/card declined/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Button States', () => {
    it('should display correct button text for trial subscription', () => {
      render(<PaymentForm {...defaultProps} trialDays={14} />);

      expect(screen.getByRole('button', { name: /start 14-day free trial/i })).toBeInTheDocument();
    });

    it('should display correct button text for immediate subscription', () => {
      render(<PaymentForm {...defaultProps} trialDays={0} />);

      expect(screen.getByRole('button', { name: /subscribe now/i })).toBeInTheDocument();
    });

    it('should disable button during loading', async () => {
      mockCreateSetupIntent.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ clientSecret: 'test', setupIntentId: 'test' }), 100)
          )
      );

      render(<PaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Billing Interval Display', () => {
    it('should display monthly billing correctly', () => {
      render(<PaymentForm {...defaultProps} billingInterval="monthly" />);

      expect(screen.getByText(/\$29.*per month/i)).toBeInTheDocument();
    });

    it('should display annual billing correctly', () => {
      render(<PaymentForm {...defaultProps} price={290} billingInterval="annual" />);

      expect(screen.getByText(/\$290.*per year/i)).toBeInTheDocument();
    });
  });

  describe('Card Element Styling', () => {
    it('should render card element with proper styling', () => {
      render(<PaymentForm {...defaultProps} />);

      const cardElement = screen.getByTestId('card-element');
      expect(cardElement).toBeInTheDocument();
      // Card element should be within a styled container
      const container = cardElement.closest('.p-3');
      expect(container).toHaveClass('border', 'rounded-md');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<PaymentForm {...defaultProps} />);

      // Should have a form element
      const form = document.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have accessible button', () => {
      render(<PaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button');
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue({ /* mock card element */ });

      mockConfirmSetup.mockResolvedValue({
        setupIntent: null,
        error: { message: 'Payment error' },
      });

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/payment error/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Integration Flow', () => {
    it('should complete full payment flow successfully', async () => {
      const user = userEvent.setup();
      mockElements.getElement.mockReturnValue({ /* mock card element */ });

      const onSuccess = vi.fn();
      render(<PaymentForm {...defaultProps} onSuccess={onSuccess} />);

      // Wait for setup intent creation
      await waitFor(() => {
        expect(mockCreateSetupIntent).toHaveBeenCalled();
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /start.*trial/i });
      await user.click(submitButton);

      // Verify full flow
      await waitFor(() => {
        expect(mockConfirmSetup).toHaveBeenCalledWith({
          clientSecret: 'seti_test_secret_123',
          elements: mockElements,
        });
        expect(mockCreateSubscription).toHaveBeenCalledWith({
          planId: 'plan_pro',
          paymentMethodId: 'pm_test_123',
        });
        expect(onSuccess).toHaveBeenCalledWith({
          id: 'sub_test_123',
          status: 'trialing',
          planId: 'plan_pro',
        });
      });
    });
  });
});
