import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all locations
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const locations = await prisma.location.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      menu: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  res.json({ locations });
}));

// Get location by ID
router.get('/:id', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const location = await prisma.location.findUnique({
    where: { id: Number(req.params.id), isActive: true },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      email: true,
      menu: true
    }
  });

  if (!location) {
    throw createError('Location not found', 404);
  }

  res.json({ location });
}));

// Create new location
router.post('/', requireAdmin, [
  body('name').notEmpty().trim(),
  body('address').notEmpty().trim(),
  body('phone').optional().isMobilePhone('any'),
  body('email').optional().isEmail().normalizeEmail()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { name, address, phone, email } = req.body;

  const location = await prisma.location.create({
    data: {
      name,
      address,
      phone,
      email
    }
  });

  res.status(201).json({
    message: 'Location created successfully',
    location
  });
}));

// Update location
router.put('/:id', requireAdmin, [
  body('name').optional().trim(),
  body('address').optional().trim(),
  body('phone').optional().isMobilePhone('any'),
  body('email').optional().isEmail().normalizeEmail()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { name, address, phone, email } = req.body;

  const location = await prisma.location.update({
    where: { id: Number(req.params.id) },
    data: {
      name,
      address,
      phone,
      email
    }
  });

  res.json({
    message: 'Location updated successfully',
    location
  });
}));

// Delete location
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  await prisma.location.update({
    where: { id: Number(req.params.id) },
    data: {
      isActive: false
    }
  });

  res.json({ message: 'Location deleted successfully' });
}));

export default router;
