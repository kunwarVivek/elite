import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, OrderType, OrderStatus, TradeStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Secondary Marketplace Routes
 * Handles share trading, orders, and marketplace operations
 */

// ============================================================================
// MARKETPLACE LISTING
// ============================================================================

/**
 * GET /api/marketplace/shares
 * Browse available shares for sale
 */
router.get('/shares', async (req: Request, res: Response) => {
  try {
    const {
      company,
      minPrice,
      maxPrice,
      minShares,
      maxShares,
      status = 'ACTIVE',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Build filter conditions
    const where: any = {
      status: status as OrderStatus,
      orderType: OrderType.SELL,
    };

    if (minPrice || maxPrice) {
      where.pricePerShare = {};
      if (minPrice) where.pricePerShare.gte = parseFloat(minPrice as string);
      if (maxPrice) where.pricePerShare.lte = parseFloat(maxPrice as string);
    }

    if (minShares || maxShares) {
      where.quantity = {};
      if (minShares) where.quantity.gte = parseInt(minShares as string);
      if (maxShares) where.quantity.lte = parseInt(maxShares as string);
    }

    // Fetch orders with share certificate and company details
    const orders = await prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy as string]: sortOrder as string },
      include: {
        shareCertificate: {
          include: {
            spv: {
              include: {
                syndicate: true,
              },
            },
            investment: {
              include: {
                pitch: {
                  include: {
                    startup: true,
                  },
                },
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Count total for pagination
    const total = await prisma.order.count({ where });

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching marketplace shares:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace shares',
      error: error.message,
    });
  }
});

/**
 * GET /api/marketplace/shares/:shareId
 * Get detailed information about a specific share offering
 */
router.get('/shares/:shareId', async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;

    const shareCertificate = await prisma.shareCertificate.findUnique({
      where: { id: shareId },
      include: {
        spv: {
          include: {
            syndicate: {
              include: {
                leadInvestor: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        investment: {
          include: {
            pitch: {
              include: {
                startup: {
                  include: {
                    founder: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        currentOwner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        originalInvestor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        orders: {
          where: {
            status: {
              in: ['ACTIVE', 'PARTIALLY_FILLED'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!shareCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Share certificate not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { shareCertificate },
    });
  } catch (error: any) {
    console.error('Error fetching share details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch share details',
      error: error.message,
    });
  }
});

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

/**
 * POST /api/marketplace/orders
 * Create a new sell order
 */
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - user not authenticated',
      });
    }

    const { shareCertificateId, quantity, pricePerShare, expiresAt, conditions } = req.body;

    // Validate share certificate ownership
    const shareCertificate = await prisma.shareCertificate.findUnique({
      where: { id: shareCertificateId },
      include: {
        investment: true,
      },
    });

    if (!shareCertificate) {
      return res.status(404).json({
        success: false,
        message: 'Share certificate not found',
      });
    }

    if (shareCertificate.currentOwnerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this share certificate',
      });
    }

    if (!shareCertificate.isTransferable) {
      return res.status(400).json({
        success: false,
        message: 'This share certificate is not transferable',
      });
    }

    // Check 6-month holding period
    const investmentDate = shareCertificate.investment.investmentDate;
    if (investmentDate) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      if (new Date(investmentDate) > sixMonthsAgo) {
        return res.status(400).json({
          success: false,
          message: 'Minimum 6-month holding period required before selling',
        });
      }
    }

    // Validate quantity
    if (quantity > shareCertificate.totalShares) {
      return res.status(400).json({
        success: false,
        message: 'Cannot sell more shares than you own',
      });
    }

    // Calculate total amount
    const totalAmount = parseFloat(pricePerShare) * parseInt(quantity);

    // Create sell order
    const order = await prisma.order.create({
      data: {
        shareCertificateId,
        sellerId: userId,
        orderType: OrderType.SELL,
        quantity: parseInt(quantity),
        pricePerShare: parseFloat(pricePerShare),
        totalAmount,
        status: OrderStatus.ACTIVE,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        conditions: conditions || {},
      },
      include: {
        shareCertificate: {
          include: {
            investment: {
              include: {
                pitch: {
                  include: {
                    startup: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Sell order created successfully',
      data: { order },
    });
  } catch (error: any) {
    console.error('Error creating sell order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sell order',
      error: error.message,
    });
  }
});

/**
 * GET /api/marketplace/orders
 * Get user's orders (both buy and sell)
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { status, orderType, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      sellerId: userId,
    };

    if (status) {
      where.status = status as OrderStatus;
    }

    if (orderType) {
      where.orderType = orderType as OrderType;
    }

    const orders = await prisma.order.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        shareCertificate: {
          include: {
            investment: {
              include: {
                pitch: {
                  include: {
                    startup: true,
                  },
                },
              },
            },
          },
        },
        trades: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.order.count({ where });

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
});

/**
 * GET /api/marketplace/orders/:orderId
 * Get detailed information about a specific order
 */
router.get('/orders/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shareCertificate: {
          include: {
            spv: {
              include: {
                syndicate: true,
              },
            },
            investment: {
              include: {
                pitch: {
                  include: {
                    startup: true,
                  },
                },
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trades: {
          include: {
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error: any) {
    console.error('Error fetching order details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
      error: error.message,
    });
  }
});

/**
 * PUT /api/marketplace/orders/:orderId/cancel
 * Cancel an active order
 */
router.put('/orders/:orderId/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { orderId } = req.params;

    // Verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.sellerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this order',
      });
    }

    if (order.status !== OrderStatus.ACTIVE && order.status !== OrderStatus.PARTIALLY_FILLED) {
      return res.status(400).json({
        success: false,
        message: 'Can only cancel active or partially filled orders',
      });
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order: updatedOrder },
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message,
    });
  }
});

// ============================================================================
// TRADING
// ============================================================================

/**
 * POST /api/marketplace/trades
 * Execute a trade (buy shares from an order)
 */
router.post('/trades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { orderId, quantity } = req.body;

    // Fetch order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shareCertificate: true,
        seller: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== OrderStatus.ACTIVE && order.status !== OrderStatus.PARTIALLY_FILLED) {
      return res.status(400).json({
        success: false,
        message: 'Order is not available for trading',
      });
    }

    // Validate quantity
    if (quantity > order.quantity) {
      return res.status(400).json({
        success: false,
        message: 'Requested quantity exceeds available shares',
      });
    }

    // Calculate amounts
    const pricePerShare = parseFloat(order.pricePerShare.toString());
    const totalAmount = pricePerShare * parseInt(quantity);
    const platformFee = totalAmount * 0.02; // 2% platform fee
    const fees = platformFee;

    // Calculate settlement date (T+3)
    const settlementDate = new Date();
    settlementDate.setDate(settlementDate.getDate() + 3);

    // Create trade
    const trade = await prisma.trade.create({
      data: {
        orderId,
        buyerId: userId,
        quantity: parseInt(quantity),
        pricePerShare,
        totalAmount,
        fees,
        status: TradeStatus.PENDING,
        settlementDate,
      },
      include: {
        order: {
          include: {
            shareCertificate: {
              include: {
                investment: {
                  include: {
                    pitch: {
                      include: {
                        startup: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update order status
    const remainingQuantity = order.quantity - parseInt(quantity);
    const newOrderStatus =
      remainingQuantity === 0
        ? OrderStatus.FILLED
        : OrderStatus.PARTIALLY_FILLED;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        quantity: remainingQuantity,
        status: newOrderStatus,
      },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        type: 'INVESTMENT',
        amount: totalAmount + fees,
        status: 'PENDING',
        paymentMethod: 'MARKETPLACE',
        feeAmount: fees,
        netAmount: totalAmount,
        description: `Purchase of ${quantity} shares`,
        metadata: {
          tradeId: trade.id,
          orderId,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Trade executed successfully',
      data: { trade },
    });
  } catch (error: any) {
    console.error('Error executing trade:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute trade',
      error: error.message,
    });
  }
});

/**
 * GET /api/marketplace/trades
 * Get user's trade history
 */
router.get('/trades', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { status, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = {
      buyerId: userId,
    };

    if (status) {
      where.status = status as TradeStatus;
    }

    const trades = await prisma.trade.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        order: {
          include: {
            shareCertificate: {
              include: {
                investment: {
                  include: {
                    pitch: {
                      include: {
                        startup: true,
                      },
                    },
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const total = await prisma.trade.count({ where });

    return res.status(200).json({
      success: true,
      data: {
        trades,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching trades:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch trades',
      error: error.message,
    });
  }
});

/**
 * GET /api/marketplace/trades/:tradeId
 * Get detailed information about a specific trade
 */
router.get('/trades/:tradeId', async (req: Request, res: Response) => {
  try {
    const { tradeId } = req.params;

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        order: {
          include: {
            shareCertificate: {
              include: {
                spv: {
                  include: {
                    syndicate: true,
                  },
                },
                investment: {
                  include: {
                    pitch: {
                      include: {
                        startup: true,
                      },
                    },
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transactions: true,
      },
    });

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'Trade not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { trade },
    });
  } catch (error: any) {
    console.error('Error fetching trade details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch trade details',
      error: error.message,
    });
  }
});

/**
 * GET /api/marketplace/order-book/:companyId
 * Get order book for a specific company
 */
router.get('/order-book/:companyId', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    // Get all active sell orders for this company
    const orders = await prisma.order.findMany({
      where: {
        orderType: OrderType.SELL,
        status: {
          in: [OrderStatus.ACTIVE, OrderStatus.PARTIALLY_FILLED],
        },
        shareCertificate: {
          investment: {
            pitch: {
              startupId: companyId,
            },
          },
        },
      },
      include: {
        shareCertificate: {
          include: {
            investment: {
              include: {
                pitch: {
                  include: {
                    startup: true,
                  },
                },
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { pricePerShare: 'asc' }, // Price priority
        { createdAt: 'asc' }, // Time priority
      ],
    });

    // Calculate market stats
    const totalVolume = orders.reduce((sum, order) => sum + order.quantity, 0);
    const avgPrice = orders.length > 0
      ? orders.reduce((sum, order) => sum + parseFloat(order.pricePerShare.toString()), 0) / orders.length
      : 0;
    const lowestAsk = orders.length > 0 ? parseFloat(orders[0].pricePerShare.toString()) : 0;
    const highestAsk = orders.length > 0
      ? parseFloat(orders[orders.length - 1].pricePerShare.toString())
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        orders,
        stats: {
          totalVolume,
          avgPrice,
          lowestAsk,
          highestAsk,
          ordersCount: orders.length,
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching order book:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch order book',
      error: error.message,
    });
  }
});

export default router;
