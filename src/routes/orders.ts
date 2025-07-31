import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { io } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireKitchenOrAdmin, requireWaiterOrAdmin, AuthRequest, UserRoleType, UserRole } from '../middleware/auth';

// Order status enum
export enum OrderStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

const router = express.Router();

// Get orders with filters
router.get('/', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { status, locationId, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const whereClause: any = {};

  // Role-based filtering
  if (req.user!.role === UserRole.CUSTOMER) {
    whereClause.userId = req.user!.id;
  }

  if (status) {
    whereClause.status = status;
  }

  if (locationId) {
    whereClause.locationId = Number(locationId);
  }

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            menu: {
              select: {
                title: true,
                price: true
              }
            },
            customizations: {
              include: {
                customization: {
                  select: {
                    name: true,
                    price: true
                  }
                }
              }
            }
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: Number(limit)
    }),
    prisma.order.count({ where: whereClause })
  ]);

  res.json({
    orders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: totalCount,
      pages: Math.ceil(totalCount / Number(limit))
    }
  });
}));

// Get single order
router.get('/:id', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = Number(req.params.id);

  const whereClause: any = { id: orderId };

  // Customers can only see their own orders
  if (req.user!.role === UserRole.CUSTOMER) {
    whereClause.userId = req.user!.id;
  }

  const order = await prisma.order.findUnique({
    where: whereClause,
    include: {
      items: {
        include: {
          menu: {
            select: {
              title: true,
              description: true,
              price: true,
              imageUrl: true
            }
          },
          customizations: {
            include: {
              customization: {
                select: {
                  name: true,
                  price: true,
                  category: true
                }
              }
            }
          }
        }
      },
      location: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true
        }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true
        }
      }
    }
  });

  if (!order) {
    throw createError('Order not found', 404);
  }

  res.json({ order });
}));

// Create new order
router.post('/', authenticateToken, [
  body('locationId').isInt(),
  body('items').isArray({ min: 1 }),
  body('items.*.menuId').isInt(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.customizations').optional().isArray()
], asyncHandler(async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { locationId, items } = req.body;

  // Verify location exists
  const location = await prisma.location.findUnique({
    where: { id: locationId, isActive: true }
  });

  if (!location) {
    throw createError('Location not found', 404);
  }

  // Verify all menu items exist and calculate total
  let total = 0;
  const menuItems = await Promise.all(
    items.map(async (item: any) => {
      const menuItem = await prisma.menu.findUnique({
        where: { id: item.menuId, isAvailable: true },
        include: { customizations: true }
      });

      if (!menuItem) {
        throw createError(`Menu item with ID ${item.menuId} not found`, 404);
      }

      if (menuItem.locationId !== locationId) {
        throw createError(`Menu item ${menuItem.title} not available at this location`, 400);
      }

      let itemTotal = menuItem.price * item.quantity;

      // Calculate customizations cost
      if (item.customizations && item.customizations.length > 0) {
        const customizationCosts = await Promise.all(
          item.customizations.map(async (customization: any) => {
            const customizationItem = await prisma.customization.findUnique({
              where: { id: customization.customizationId }
            });

            if (!customizationItem) {
              throw createError(`Customization with ID ${customization.customizationId} not found`, 404);
            }

            return customizationItem.price * (customization.quantity || 1);
          })
        );

        itemTotal += customizationCosts.reduce((sum, cost) => sum + cost, 0) * item.quantity;
      }

      total += itemTotal;

      return {
        ...item,
        menuItem,
        itemTotal
      };
    })
  );

  // Create order using transaction
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        locationId,
        userId: req.user!.id,
        status: OrderStatus.PENDING,
        total
      }
    });

    // Create order items
    for (const item of menuItems) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          menuId: item.menuId,
          quantity: item.quantity,
          priceAtTime: item.menuItem.price
        }
      });

      // Create customizations if any
      if (item.customizations && item.customizations.length > 0) {
        for (const customization of item.customizations) {
          const customizationItem = await tx.customization.findUnique({
            where: { id: customization.customizationId }
          });

          await tx.orderItemCustomization.create({
            data: {
              orderItemId: orderItem.id,
              customizationId: customization.customizationId,
              quantity: customization.quantity || 1,
              priceAtTime: customizationItem!.price
            }
          });
        }
      }
    }

    return newOrder;
  });

  // Get the complete order with all relations
  const completeOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: {
          menu: {
            select: {
              title: true,
              price: true
            }
          },
          customizations: {
            include: {
              customization: {
                select: {
                  name: true,
                  price: true
                }
              }
            }
          }
        }
      },
      location: {
        select: {
          name: true
        }
      },
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  // Emit real-time event for new order
  io.to(`location_${locationId}`).emit('newOrder', completeOrder);
  io.to(`user_${req.user!.id}`).emit('orderCreated', completeOrder);

  res.status(201).json({
    message: 'Order created successfully',
    order: completeOrder
  });
}));

// Update order status
router.patch('/:id/status', authenticateToken, requireKitchenOrAdmin, [
  body('status').isIn(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { status } = req.body;
  const orderId = Number(req.params.id);

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status },
    include: {
      items: {
        include: {
          menu: {
            select: {
              title: true
            }
          }
        }
      },
      location: {
        select: {
          name: true
        }
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  // Emit real-time event for status update
  io.to(`location_${order.locationId}`).emit('orderStatusUpdated', order);
  io.to(`user_${order.userId}`).emit('orderStatusUpdated', order);

  res.json({
    message: 'Order status updated successfully',
    order
  });
}));

// Cancel order (customers can cancel their own orders if still pending)
router.patch('/:id/cancel', authenticateToken, asyncHandler(async (req: AuthRequest, res: Response) => {
  const orderId = Number(req.params.id);

  const existingOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true
        }
      }
    }
  });

  if (!existingOrder) {
    throw createError('Order not found', 404);
  }

  // Only customers can cancel their own orders, or staff can cancel any order
  if (req.user!.role === UserRole.CUSTOMER && existingOrder.userId !== req.user!.id) {
    throw createError('Not authorized to cancel this order', 403);
  }

  // Can only cancel pending orders
  if (existingOrder.status !== OrderStatus.PENDING) {
    throw createError('Can only cancel pending orders', 400);
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELLED },
    include: {
      items: {
        include: {
          menu: {
            select: {
              title: true
            }
          }
        }
      },
      location: {
        select: {
          name: true
        }
      },
      user: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });

  // Emit real-time event for cancellation
  io.to(`location_${order.locationId}`).emit('orderCancelled', order);
  io.to(`user_${order.userId}`).emit('orderCancelled', order);

  res.json({
    message: 'Order cancelled successfully',
    order
  });
}));

export default router;
