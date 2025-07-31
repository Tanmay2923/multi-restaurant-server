import express, { Request, Response } from 'express';
import { prisma } from '../index';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import QRCode from 'qrcode';

const router = express.Router();

// Get QR code for a location
router.get('/generate/:locationId', authenticateToken, requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { locationId } = req.params;
  const location = await prisma.location.findUnique({
    where: { id: Number(locationId) }
  });

  if (!location) {
    throw createError('Location not found', 404);
  }

  const qrCodeData = `https://yourdomain.com/visit/${locationId}`;
  const qrCodeImage = await QRCode.toDataURL(qrCodeData);

  res.json({ qrCode: qrCodeImage });
}));

// Get QR code details
router.get('/:code', asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;

  const qrCode = await prisma.qRCode.findUnique({
    where: { code },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          address: true
        }
      }
    }
  });

  if (!qrCode) {
    throw createError('QR code not found', 404);
  }

  res.json({ qrCode });
}));

export default router;
