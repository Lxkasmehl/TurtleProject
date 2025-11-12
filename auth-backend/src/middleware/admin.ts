import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

/**
 * Middleware to check if the authenticated user is an admin
 * Must be used after authenticateToken middleware
 */
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};

