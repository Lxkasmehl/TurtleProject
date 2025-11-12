import express, { Response } from 'express';
import db from '../db/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import type { User } from '../types/user.js';

const router = express.Router();

// Promote user to admin (admin only)
router.post(
  '/promote-to-admin',
  authenticateToken,
  requireAdmin,
  (req: AuthRequest, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      // Find user by email
      const user = db
        .prepare('SELECT id, email, role FROM users WHERE email = ?')
        .get(email) as User | undefined;

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (user.role === 'admin') {
        res.status(400).json({ error: 'User is already an admin' });
        return;
      }

      // Update user role to admin
      db.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
        'admin',
        user.id
      );

      res.json({
        success: true,
        message: `User ${email} has been promoted to admin`,
        user: {
          id: user.id,
          email: user.email,
          role: 'admin',
        },
      });
    } catch (error) {
      console.error('Promote to admin error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get all users (admin only) - for admin dashboard
router.get(
  '/users',
  authenticateToken,
  requireAdmin,
  (req: AuthRequest, res: Response) => {
    try {
      const users = db
        .prepare(
          'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC'
        )
        .all() as (Omit<User, 'google_id'>)[];

      res.json({
        success: true,
        users,
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

