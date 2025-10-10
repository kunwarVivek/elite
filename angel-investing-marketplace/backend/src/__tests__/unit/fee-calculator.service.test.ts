import { FeeCalculatorService } from '../../services/fee-calculator.service';

describe('FeeCalculatorService', () => {
  describe('calculateInvestmentFees', () => {
    it('should calculate fees for direct investment correctly', () => {
      const amount = 1000;
      const result = FeeCalculatorService.calculateInvestmentFees(amount, 'DIRECT');

      expect(result.investmentAmount).toBe(amount);
      expect(result.platformFee).toBeGreaterThan(0);
      expect(result.carryFee).toBe(0); // No performance data provided
      expect(result.totalFee).toBe(result.platformFee + (result.feeBreakdown.processingFee || 0));
      expect(result.netAmount).toBe(amount - result.totalFee);
      expect(result.feeBreakdown.platformFee).toBe(result.platformFee);
      expect(result.feeBreakdown.carryFee).toBe(0);
    });

    it('should calculate fees for syndicate investment correctly', () => {
      const amount = 1000;
      const result = FeeCalculatorService.calculateInvestmentFees(amount, 'SYNDICATE');

      expect(result.investmentAmount).toBe(amount);
      expect(result.platformFee).toBeGreaterThan(0);
      expect(result.netAmount).toBeLessThan(amount);
    });

    it('should calculate carry fee when performance data is provided', () => {
      const amount = 1000;
      const performanceMultiple = 2.0; // 2x return
      const result = FeeCalculatorService.calculateInvestmentFees(amount, 'DIRECT', performanceMultiple);

      expect(result.carryFee).toBeGreaterThan(0);
      expect(result.totalFee).toBe(result.platformFee + result.carryFee + (result.feeBreakdown.processingFee || 0));
    });

    it('should not charge carry fee for break-even performance', () => {
      const amount = 1000;
      const performanceMultiple = 1.0; // Break-even
      const result = FeeCalculatorService.calculateInvestmentFees(amount, 'DIRECT', performanceMultiple);

      expect(result.carryFee).toBe(0);
    });

    it('should not charge carry fee for loss', () => {
      const amount = 1000;
      const performanceMultiple = 0.8; // 20% loss
      const result = FeeCalculatorService.calculateInvestmentFees(amount, 'DIRECT', performanceMultiple);

      expect(result.carryFee).toBe(0);
    });
  });

  describe('calculatePlatformFee', () => {
    it('should calculate direct investment platform fee correctly', () => {
      const amount = 1000;
      const fee = FeeCalculatorService.calculatePlatformFee(amount, 'DIRECT');

      expect(fee).toBeGreaterThan(0);
      expect(fee).toBeLessThan(amount);
    });

    it('should calculate syndicate investment platform fee correctly', () => {
      const amount = 1000;
      const directFee = FeeCalculatorService.calculatePlatformFee(amount, 'DIRECT');
      const syndicateFee = FeeCalculatorService.calculatePlatformFee(amount, 'SYNDICATE');

      // Syndicate fees should be different from direct fees
      expect(syndicateFee).not.toBe(directFee);
    });

    it('should enforce minimum fee', () => {
      const smallAmount = 1; // Very small amount
      const fee = FeeCalculatorService.calculatePlatformFee(smallAmount, 'DIRECT');

      // Should be at least the minimum fee
      expect(fee).toBeGreaterThan(0);
    });
  });

  describe('calculateCarryFee', () => {
    it('should calculate carry fee for profitable investment', () => {
      const initialInvestment = 1000;
      const performanceMultiple = 2.5; // 2.5x return = $1500 profit

      const carryFee = FeeCalculatorService.calculateCarryFee(initialInvestment, performanceMultiple);

      expect(carryFee).toBeGreaterThan(0);
      // Should be 20% of profit (assuming 20% carry)
      const expectedProfit = (performanceMultiple - 1) * initialInvestment;
      const expectedCarry = expectedProfit * 0.2; // Assuming 20% carry percentage
      expect(carryFee).toBeCloseTo(expectedCarry, 2);
    });

    it('should return 0 for break-even performance', () => {
      const initialInvestment = 1000;
      const performanceMultiple = 1.0;

      const carryFee = FeeCalculatorService.calculateCarryFee(initialInvestment, performanceMultiple);

      expect(carryFee).toBe(0);
    });

    it('should return 0 for loss', () => {
      const initialInvestment = 1000;
      const performanceMultiple = 0.8; // 20% loss

      const carryFee = FeeCalculatorService.calculateCarryFee(initialInvestment, performanceMultiple);

      expect(carryFee).toBe(0);
    });
  });

  describe('calculateProcessingFee', () => {
    it('should calculate processing fee correctly', () => {
      const amount = 1000;
      const fee = FeeCalculatorService.calculateProcessingFee(amount);

      expect(fee).toBeGreaterThan(0);
      // Should include Stripe fees (2.9% + $0.30) + additional fees
      const expectedStripeFee = (amount * 0.029) + 0.30;
      expect(fee).toBeCloseTo(expectedStripeFee + 0.10, 2); // + $0.10 additional fees
    });

    it('should handle small amounts correctly', () => {
      const amount = 1;
      const fee = FeeCalculatorService.calculateProcessingFee(amount);

      expect(fee).toBeGreaterThan(0);
      expect(fee).toBeLessThan(amount);
    });
  });

  describe('calculateCarry', () => {
    it('should calculate carry with all parameters', () => {
      const data = {
        initialInvestment: 1000,
        currentValue: 2500, // 2.5x return
        carryPercentage: 0.2 // 20% carry
      };

      const result = FeeCalculatorService.calculateCarry(data);

      expect(result.initialInvestment).toBe(data.initialInvestment);
      expect(result.currentValue).toBe(data.currentValue);
      expect(result.performanceMultiple).toBe(2.5);
      expect(result.carryPercentage).toBe(data.carryPercentage);
      expect(result.carryAmount).toBeGreaterThan(0);
      expect(result.netReturn).toBe(data.currentValue - data.initialInvestment - result.carryAmount);
    });

    it('should use default carry percentage when not provided', () => {
      const data = {
        initialInvestment: 1000,
        currentValue: 2000
      };

      const result = FeeCalculatorService.calculateCarry(data);

      expect(result.carryPercentage).toBeGreaterThan(0);
      expect(result.carryPercentage).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateFeeDistribution', () => {
    it('should calculate fee distribution correctly', () => {
      const investmentId = 'inv_123';
      const investorId = 'user_123';
      const startupId = 'startup_123';
      const amount = 1000;

      const result = FeeCalculatorService.calculateFeeDistribution(
        investmentId,
        investorId,
        startupId,
        amount,
        'DIRECT'
      );

      expect(result.investmentId).toBe(investmentId);
      expect(result.investorId).toBe(investorId);
      expect(result.startupId).toBe(startupId);
      expect(result.totalAmount).toBe(amount);
      expect(result.platformFee).toBeGreaterThan(0);
      expect(result.startupReceives).toBeLessThan(amount);
      expect(result.startupReceives).toBe(amount - result.platformFee - (result.distributions.processingFees || 0));
    });
  });

  describe('calculateBulkFees', () => {
    it('should calculate fees for multiple investments', () => {
      const investments = [
        { amount: 1000, investmentType: 'DIRECT' as const },
        { amount: 2000, investmentType: 'SYNDICATE' as const },
        { amount: 1500, investmentType: 'DIRECT' as const, performanceMultiple: 2.0 }
      ];

      const result = FeeCalculatorService.calculateBulkFees(investments);

      expect(result.totalInvestmentAmount).toBe(4500);
      expect(result.breakdown).toHaveLength(3);
      expect(result.totalFees).toBeGreaterThan(0);
      expect(result.netAmount).toBe(result.totalInvestmentAmount - result.totalFees);

      // Verify individual breakdowns
      result.breakdown.forEach((breakdown, index) => {
        expect(breakdown.investmentAmount).toBe(investments[index]?.amount || 0);
      });
    });

    it('should handle empty investment array', () => {
      const result = FeeCalculatorService.calculateBulkFees([]);

      expect(result.totalInvestmentAmount).toBe(0);
      expect(result.totalFees).toBe(0);
      expect(result.netAmount).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });

  describe('validateFeeInputs', () => {
    it('should pass validation for valid inputs', () => {
      expect(() => {
        FeeCalculatorService.validateFeeInputs(1000, 'DIRECT');
      }).not.toThrow();
    });

    it('should throw error for negative amount', () => {
      expect(() => {
        FeeCalculatorService.validateFeeInputs(-100);
      }).toThrow('Investment amount must be greater than 0');
    });

    it('should throw error for zero amount', () => {
      expect(() => {
        FeeCalculatorService.validateFeeInputs(0);
      }).toThrow('Investment amount must be greater than 0');
    });

    it('should throw error for invalid investment type', () => {
      expect(() => {
        FeeCalculatorService.validateFeeInputs(1000, 'INVALID' as any);
      }).toThrow('Invalid investment type');
    });
  });

  describe('getFeeStructure', () => {
    it('should return current fee structure', () => {
      const structure = FeeCalculatorService.getFeeStructure();

      expect(structure.platformFees).toBeDefined();
      expect(structure.carry).toBeDefined();
      expect(structure.limits).toBeDefined();
      expect(structure.platformFees.direct).toBeGreaterThan(0);
      expect(structure.platformFees.syndicate).toBeGreaterThan(0);
      expect(structure.carry.percentage).toBeGreaterThan(0);
      expect(structure.limits.minimum).toBeGreaterThan(0);
      expect(structure.limits.maximum).toBeGreaterThan(structure.limits.minimum);
    });
  });

  describe('error handling', () => {
    it('should handle errors in calculateInvestmentFees gracefully', () => {
      // Mock console.error to avoid test output pollution
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        // This should not throw but handle errors internally
        FeeCalculatorService.calculateInvestmentFees(1000);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('should handle errors in calculateCarry gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        FeeCalculatorService.calculateCarry({
          initialInvestment: 1000,
          currentValue: 2000
        });
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });
});