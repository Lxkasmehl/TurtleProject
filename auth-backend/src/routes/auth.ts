import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import type { RegisterRequest, LoginRequest, User } from '../types/user.js';

const router = express.Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, token }: RegisterRequest & { token?: string } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Check if user already exists (case-insensitive email check)
    const emailLower = email.toLowerCase();
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(emailLower) as User | undefined;

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // Check if there's a valid admin invitation token
    let role: 'community' | 'admin' = 'community';
    if (token) {
      const invitation = db
        .prepare(
          'SELECT * FROM admin_invitations WHERE token = ? AND used = 0 AND expires_at > datetime("now")'
        )
        .get(token) as any;

      if (invitation && invitation.email.toLowerCase() === email.toLowerCase()) {
        role = 'admin';
        // Mark invitation as used
        db.prepare('UPDATE admin_invitations SET used = 1 WHERE token = ?').run(token);
      } else if (invitation) {
        res.status(400).json({
          error: 'Invitation token is valid but for a different email address',
        });
        return;
      } else {
        res.status(400).json({ error: 'Invalid or expired invitation token' });
        return;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Normalize email to lowercase for storage
    const emailNormalized = email.toLowerCase();

    // Insert user with appropriate role
    const result = db
      .prepare(
        'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
      )
      .run(emailNormalized, passwordHash, name || null, role);

    // Reload database to ensure we have the latest data
    const user = db
      .prepare('SELECT id, email, name, role, google_id, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as User;

    if (!user) {
      console.error('Failed to retrieve newly created user from database');
      console.error(`   Tried to find user with ID: ${result.lastInsertRowid}, Email: ${emailNormalized}`);
      res.status(500).json({ error: 'Failed to create user account' });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user (case-insensitive email check)
    const emailLower = email.toLowerCase();
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(emailLower) as (User & { password_hash: string }) | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Check if user has a password (not Google-only account)
    if (!user.password_hash) {
      res.status(401).json({
        error: 'This account was created with Google. Please use Google login.',
      });
      return;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get invitation details by token (public endpoint for registration page)
router.get('/invitation/:token', (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const invitation = db
      .prepare(
        'SELECT * FROM admin_invitations WHERE token = ? AND used = 0 AND expires_at > datetime("now")'
      )
      .get(token) as any;

    if (!invitation) {
      res.status(404).json({ error: 'Invalid or expired invitation token' });
      return;
    }

    res.json({
      success: true,
      invitation: {
        email: invitation.email,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = db
      .prepare('SELECT id, email, name, role, google_id, created_at FROM users WHERE id = ?')
      .get(req.user.id) as User;

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we can track it here if needed)
router.post('/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;

