import express, { Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import type { User } from '../types/user.js';

const router = express.Router();

// Initiate Google OAuth
router.get('/google', (req: Request, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    res.status(503).json({
      error: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env',
    });
    return;
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
});

// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as User & { password_hash?: string };

      if (!user) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        return;
      }

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
        return;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(
        `${frontendUrl}/login?token=${token}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || '')}&role=${user.role}`
      );
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
  }
);

export default router;

