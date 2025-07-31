import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define user roles as string constants
export const UserRole = {
  ADMIN: 'ADMIN',
  KITCHEN: 'KITCHEN',
  WAITER: 'WAITER',
  CUSTOMER: 'CUSTOMER'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: UserRoleType;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = decoded as any;
    next();
  });
};

export const requireRole = (roles: UserRoleType[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole([UserRole.ADMIN]);
export const requireKitchenOrAdmin = requireRole([UserRole.KITCHEN, UserRole.ADMIN]);
export const requireWaiterOrAdmin = requireRole([UserRole.WAITER, UserRole.ADMIN]);
