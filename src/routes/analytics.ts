import express, { Request, Response } from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get analytics for a location
router.get('/location/:locationId', authenticateToken, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { locationId } = req.params;
  const { startDate, endDate } = req.query;

  // Validate date range
  if (!startDate || !endDate) {
    throw createError('Start date and end date are required', 400);
  }

  const analyticsData = await prisma.analytics.findMany({
    where: {
      locationId: Number(locationId),
      date: {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate))
      }
    },
    orderBy: {
      date: 'asc'
    }
  });

  res.json({ analytics: analyticsData });
}));

// Summarize analytics across all locations
router.get('/summary', authenticateToken, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const summary = await prisma.$queryRaw`SELECT
    SUM(totalOrders) as totalOrders,
    SUM(totalRevenue) as totalRevenue,
    AVG(avgOrderValue) as avgOrderValue
    FROM Analytics`;

  res.json({ summary });
}));

export default router;
