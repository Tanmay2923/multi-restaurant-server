import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Get menu by location ID
router.get('/location/:locationId', asyncHandler(async (req: Request, res: Response) => {
  const { locationId } = req.params;
  const { category } = req.query;

  const whereClause: any = {
    locationId: Number(locationId),
    isAvailable: true
  };

  if (category) {
    whereClause.category = category;
  }

  const menu = await prisma.menu.findMany({
    where: whereClause,
    include: {
      customizations: true
    },
    orderBy: [
      { category: 'asc' },
      { title: 'asc' }
    ]
  });

  res.json({ menu });
}));

// Get single menu item
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const menuItem = await prisma.menu.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      customizations: true,
      location: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (!menuItem) {
    throw createError('Menu item not found', 404);
  }

  res.json({ menuItem });
}));

// Create menu item
router.post('/', requireAdmin, [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('category').notEmpty().trim(),
  body('locationId').isInt(),
  body('imageUrl').optional().isURL()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { title, description, price, category, locationId, imageUrl } = req.body;

  // Verify location exists
  const location = await prisma.location.findUnique({
    where: { id: locationId }
  });
  
  if (!location) {
    throw createError('Location not found', 404);
  }

  const menuItem = await prisma.menu.create({
    data: {
      title,
      description,
      price,
      category,
      locationId,
      imageUrl
    },
    include: {
      customizations: true
    }
  });

  res.status(201).json({
    message: 'Menu item created successfully',
    menuItem
  });
}));

// Update menu item
router.put('/:id', requireAdmin, [
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().trim(),
  body('imageUrl').optional().isURL(),
  body('isAvailable').optional().isBoolean()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { title, description, price, category, imageUrl, isAvailable } = req.body;

  const menuItem = await prisma.menu.update({
    where: { id: Number(req.params.id) },
    data: {
      title,
      description,
      price,
      category,
      imageUrl,
      isAvailable
    },
    include: {
      customizations: true
    }
  });

  res.json({
    message: 'Menu item updated successfully',
    menuItem
  });
}));

// Delete menu item
router.delete('/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  await prisma.menu.update({
    where: { id: Number(req.params.id) },
    data: {
      isAvailable: false
    }
  });

  res.json({ message: 'Menu item deleted successfully' });
}));

// Add customization to menu item
router.post('/:id/customizations', requireAdmin, [
  body('name').notEmpty().trim(),
  body('price').isFloat({ min: 0 }),
  body('category').notEmpty().trim()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { name, price, category } = req.body;
  const menuId = Number(req.params.id);

  // Verify menu item exists
  const menuItem = await prisma.menu.findUnique({
    where: { id: menuId }
  });
  
  if (!menuItem) {
    throw createError('Menu item not found', 404);
  }

  const customization = await prisma.customization.create({
    data: {
      name,
      price,
      category,
      menuId
    }
  });

  res.status(201).json({
    message: 'Customization added successfully',
    customization
  });
}));

// Update customization
router.put('/customizations/:customizationId', requireAdmin, [
  body('name').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('category').optional().trim()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createError('Validation failed', 400);
  }

  const { name, price, category } = req.body;

  const customization = await prisma.customization.update({
    where: { id: Number(req.params.customizationId) },
    data: {
      name,
      price,
      category
    }
  });

  res.json({
    message: 'Customization updated successfully',
    customization
  });
}));

// Delete customization
router.delete('/customizations/:customizationId', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  await prisma.customization.delete({
    where: { id: Number(req.params.customizationId) }
  });

  res.json({ message: 'Customization deleted successfully' });
}));

// Get menu categories for a location
router.get('/location/:locationId/categories', asyncHandler(async (req: Request, res: Response) => {
  const categories = await prisma.menu.findMany({
    where: {
      locationId: Number(req.params.locationId),
      isAvailable: true
    },
    select: {
      category: true
    },
    distinct: ['category'],
    orderBy: {
      category: 'asc'
    }
  });

  const categoryList = categories.map(item => item.category);
  
  res.json({ categories: categoryList });
}));

export default router;
