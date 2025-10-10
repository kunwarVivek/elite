import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/test-utils';
import { PaymentForm } from '../../components/payments/payment-form';

// Mock the hooks
vi.mock('../../hooks/use-payment', () => ({
  usePayment: vi.fn(() => ({
    paymentMethods: [
      {
        id: 'CARD',
        name: 'Credit/Debit Card',
        fees: { platform_fee: 50, processing_fee: 29 },
        limits: { minimum: 1, maximum: 100000 }
      },
      {
        id: 'BANK_TRANSFER',
        name: 'Bank Transfer',
        fees: { platform_fee: 25, processing_fee: 15 },
        limits: { minimum: 100, maximum: 1000000 }
      }
    ],
    selectedPaymentMethod: '',
    isProcessing: false,
    paymentIntent: null,
    error: null,
    setSelectedPaymentMethod: vi.fn(),
    processPayment: vi.fn(),
    calculateFees: vi.fn(),
    selectedMethod: null,
  }))
}));

vi.mock('../../hooks/use-escrow', () => ({
  useEscrow: vi.fn(() => ({
    escrowStatus: null,
    createEscrow: vi.fn(),
    releaseEscrow: vi.fn(),
    cancelEscrow: vi.fn(),
  }))
}));

// Mock payment utilities
vi.mock('../../lib/payment-utils', () => ({
  formatCurrency: vi.fn((amount, currency) => ({
    formatted: `${currency === 'USD' ? '$' : '€'}${amount.toFixed(2)}`,
    symbol: currency === 'USD' ? '$' : '€'
  })),
  formatFeeBreakdown: vi.fn(() => [
    { label: 'Platform Fee', amount: 50, percentage: 5 },
    { label: 'Processing Fee', amount: 29, percentage: 2.9 }
  ]),
  validatePaymentForm: vi.fn(() => ({ isValid: true, errors: [] })),
  getPaymentMethodDescription: vi.fn((method) => {
    const descriptions = {
      CARD: 'Pay with your credit or debit card',
      BANK_TRANSFER: 'Transfer directly from your bank account',
      DIGITAL_WALLET: 'Pay using digital wallet services'
    };
    return descriptions[method as keyof typeof descriptions] || 'Payment method';
  }),
  getEstimatedProcessingTime: vi.fn((method) => {
    const times = {
      CARD: 'Instant',
      BANK_TRANSFER: '1-3 business days',
      DIGITAL_WALLET: 'Instant'
    };
    return times[method as keyof typeof times] || '1-2 days';
  })
}));

describe('PaymentForm', () => {
  const defaultProps = {
    investmentId: 'investment-123',
    investmentAmount: 1000,
    startupName: 'Test Startup Inc',
    onPaymentSuccess: vi.fn(),
    onPaymentError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render investment summary correctly', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText('Investment Summary')).toBeInTheDocument();
      expect(screen.getByText('Review your investment in Test Startup Inc')).toBeInTheDocument();
      expect(screen.getByText('Investment Amount:')).toBeInTheDocument();
      expect(screen.getByText('Investment Type:')).toBeInTheDocument();
      expect(screen.getByText('DIRECT')).toBeInTheDocument();
    });

    it('should render payment form with all required fields', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText('Payment Information')).toBeInTheDocument();
      expect(screen.getByLabelText(/investment amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/investment type/i)).toBeInTheDocument();
      expect(screen.getByText('Payment Method')).toBeInTheDocument();
    });

    it('should render available payment methods', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText('Credit/Debit Card')).toBeInTheDocument();
      expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
      expect(screen.getByText('Pay with your credit or debit card')).toBeInTheDocument();
      expect(screen.getByText('Transfer directly from your bank account')).toBeInTheDocument();
    });

    it('should render security notice', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText(/your payment information is encrypted and secure/i)).toBeInTheDocument();
      expect(screen.getByText(/all investments are held in escrow/i)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update amount when user types', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '2500');

      expect(amountInput).toHaveValue('2500');
    });

    it('should change currency when user selects different option', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const currencySelect = screen.getByLabelText(/currency/i);
      await user.click(currencySelect);
      await user.click(screen.getByText('EUR (€)'));

      // Currency change should be reflected in the UI
      expect(screen.getByText('EUR (€)')).toBeInTheDocument();
    });

    it('should change investment type when user selects different option', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const investmentTypeSelect = screen.getByLabelText(/investment type/i);
      await user.click(investmentTypeSelect);
      await user.click(screen.getByText('Syndicate Investment'));

      expect(screen.getByText('SYNDICATE')).toBeInTheDocument();
    });

    it('should select payment method when user clicks', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const cardPaymentMethod = screen.getByText('Credit/Debit Card').closest('div');
      await user.click(cardPaymentMethod!);

      // The payment method should be visually selected
      expect(cardPaymentMethod).toHaveClass('border-blue-500', 'bg-blue-50');
    });
  });

  describe('Form Validation', () => {
    it('should show error for invalid amount', async () => {
      const user = userEvent.setup();
      const mockOnError = vi.fn();
      render(<PaymentForm {...defaultProps} onPaymentError={mockOnError} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '0');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalledWith('Please enter a valid amount');
    });

    it('should show error for missing payment method', async () => {
      const user = userEvent.setup();
      const mockOnError = vi.fn();
      render(<PaymentForm {...defaultProps} onPaymentError={mockOnError} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '1000');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalled();
    });

    it('should disable submit button when amount is empty', () => {
      render(<PaymentForm {...defaultProps} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      const submitButton = screen.getByRole('button', { name: /pay/i });

      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when payment method is not selected', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '1000');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Payment Processing', () => {
    it('should call processPayment when form is submitted with valid data', async () => {
      const user = userEvent.setup();
      const mockProcessPayment = vi.fn();

      // Mock the usePayment hook to return our mock function
      const { usePayment } = await import('../../hooks/use-payment');
      vi.mocked(usePayment).mockReturnValue({
        paymentMethods: [
          {
            id: 'CARD',
            name: 'Credit/Debit Card',
            fees: { platform_fee: 50, processing_fee: 29 },
            limits: { minimum: 1, maximum: 100000 }
          }
        ],
        selectedPaymentMethod: 'CARD',
        isProcessing: false,
        paymentIntent: null,
        error: null,
        setSelectedPaymentMethod: vi.fn(),
        processPayment: mockProcessPayment,
        calculateFees: vi.fn(),
        selectedMethod: null,
      });

      render(<PaymentForm {...defaultProps} />);

      // Select payment method
      const cardPaymentMethod = screen.getByText('Credit/Debit Card').closest('div');
      await user.click(cardPaymentMethod!);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      expect(mockProcessPayment).toHaveBeenCalledWith({
        investmentId: 'investment-123',
        amount: 1000,
        paymentMethod: 'CARD',
        investmentType: 'DIRECT',
      });
    });

    it('should show loading state during payment processing', async () => {
      const user = userEvent.setup();

      // Mock processing state
      const { usePayment } = await import('../../hooks/use-payment');
      vi.mocked(usePayment).mockReturnValue({
        paymentMethods: [
          {
            id: 'CARD',
            name: 'Credit/Debit Card',
            fees: { platform_fee: 50, processing_fee: 29 },
            limits: { minimum: 1, maximum: 100000 }
          }
        ],
        selectedPaymentMethod: 'CARD',
        isProcessing: true,
        paymentIntent: null,
        error: null,
        setSelectedPaymentMethod: vi.fn(),
        processPayment: vi.fn(),
        calculateFees: vi.fn(),
        selectedMethod: null,
      });

      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText('Processing Payment...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /processing payment/i })).toBeDisabled();
    });
  });

  describe('Fee Calculation', () => {
    it('should display fee breakdown when fees are calculated', async () => {
      const user = userEvent.setup();

      // Mock fees calculation
      const mockFees = {
        investmentAmount: 1000,
        platformFee: 50,
        processingFee: 29,
        totalFee: 79,
        netAmount: 921,
        feeBreakdown: {
          platformFee: 50,
          processingFee: 29,
        }
      };

      const { usePayment } = await import('../../hooks/use-payment');
      vi.mocked(usePayment).mockReturnValue({
        paymentMethods: [],
        selectedPaymentMethod: '',
        isProcessing: false,
        paymentIntent: null,
        error: null,
        setSelectedPaymentMethod: vi.fn(),
        processPayment: vi.fn(),
        calculateFees: vi.fn().mockResolvedValue(mockFees),
        selectedMethod: null,
      });

      render(<PaymentForm {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Fee Breakdown')).toBeInTheDocument();
        expect(screen.getByText('Platform Fee')).toBeInTheDocument();
        expect(screen.getByText('Processing Fee')).toBeInTheDocument();
      });
    });

    it('should update fees when amount changes', async () => {
      const user = userEvent.setup();
      const mockCalculateFees = vi.fn();

      const { usePayment } = await import('../../hooks/use-payment');
      vi.mocked(usePayment).mockReturnValue({
        paymentMethods: [],
        selectedPaymentMethod: '',
        isProcessing: false,
        paymentIntent: null,
        error: null,
        setSelectedPaymentMethod: vi.fn(),
        processPayment: vi.fn(),
        calculateFees: mockCalculateFees,
        selectedMethod: null,
      });

      render(<PaymentForm {...defaultProps} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '2000');

      await waitFor(() => {
        expect(mockCalculateFees).toHaveBeenCalledWith(2000, 'DIRECT');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when payment fails', async () => {
      const { usePayment } = await import('../../hooks/use-payment');
      vi.mocked(usePayment).mockReturnValue({
        paymentMethods: [],
        selectedPaymentMethod: '',
        isProcessing: false,
        paymentIntent: null,
        error: 'Payment processing failed',
        setSelectedPaymentMethod: vi.fn(),
        processPayment: vi.fn(),
        calculateFees: vi.fn(),
        selectedMethod: null,
      });

      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByText('Payment processing failed')).toBeInTheDocument();
    });

    it('should call onPaymentError when validation fails', async () => {
      const user = userEvent.setup();
      const mockOnError = vi.fn();

      // Mock validation failure
      const { validatePaymentForm } = await import('../../lib/payment-utils');
      vi.mocked(validatePaymentForm).mockReturnValue({
        isValid: false,
        errors: ['Invalid payment method']
      });

      render(<PaymentForm {...defaultProps} onPaymentError={mockOnError} />);

      // Select payment method and submit
      const cardPaymentMethod = screen.getByText('Credit/Debit Card').closest('div');
      await user.click(cardPaymentMethod!);

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      expect(mockOnError).toHaveBeenCalledWith('Invalid payment method');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByLabelText(/investment amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/investment type/i)).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      render(<PaymentForm {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /pay/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/investment amount/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/currency/i)).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('should render properly on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<PaymentForm {...defaultProps} />);

      const container = screen.getByText('Investment Summary').closest('.max-w-2xl');
      expect(container).toHaveClass('max-w-2xl');
    });
  });

  describe('Real-time Updates', () => {
    it('should update payment method fees when selection changes', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      // Initially no payment method selected
      expect(screen.getByText(/choose your preferred payment method/i)).toBeInTheDocument();

      // Select card payment
      const cardPaymentMethod = screen.getByText('Credit/Debit Card').closest('div');
      await user.click(cardPaymentMethod!);

      // Should show card-specific information
      expect(screen.getByText(/instant/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle decimal amounts correctly', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '1234.56');

      expect(amountInput).toHaveValue('1234.56');
    });

    it('should handle very large amounts', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '999999.99');

      expect(amountInput).toHaveValue('999999.99');
    });

    it('should handle minimum amount validation', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const amountInput = screen.getByLabelText(/investment amount/i);
      await user.clear(amountInput);
      await user.type(amountInput, '0.01');

      // Should still be valid (assuming minimum is 1)
      expect(amountInput).toHaveValue('0.01');
    });
  });
});