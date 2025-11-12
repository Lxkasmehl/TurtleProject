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
    const { email, password, name }: RegisterRequest = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Check if user already exists
    const existingUser = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email) as User | undefined;

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user - always set role to 'community' (cannot be changed during registration)
    const result = db
      .prepare(
        'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
      )
      .run(email, passwordHash, name || null, 'community');

    const user = db
      .prepare('SELECT id, email, name, role, google_id, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as User;

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

    res.status(201).json({
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

    // Find user
    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as (User & { password_hash: string }) | undefined;

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

