// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../db/database.js';
import type { User } from '../types/user.js';

// Build full callback URL from environment or use default
const getCallbackURL = (): string => {
  const baseURL = process.env.AUTH_BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${baseURL}/api/auth/google/callback`;
};

// Only configure Google OAuth if credentials are provided
const googleClientID = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

console.log('🔍 Checking Google OAuth configuration...');
console.log('GOOGLE_CLIENT_ID:', googleClientID ? `${googleClientID.substring(0, 20)}...` : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', googleClientSecret ? 'SET' : 'NOT SET');

if (googleClientID && googleClientSecret && googleClientID !== '' && googleClientSecret !== '') {
  console.log('✅ Configuring Google OAuth...');
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientID,
        clientSecret: googleClientSecret,
        callbackURL: getCallbackURL(),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this Google ID
          let user = db
            .prepare('SELECT * FROM users WHERE google_id = ?')
            .get(profile.id) as (User & { password_hash?: string }) | undefined;

          if (user) {
            // User exists, return it
            return done(null, user);
          }

          // Check if user exists with this email
          user = db
            .prepare('SELECT * FROM users WHERE email = ?')
            .get(profile.emails?.[0]?.value) as
            | (User & { password_hash?: string })
            | undefined;

          if (user) {
            // User exists but doesn't have Google ID, link it
            db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(
              profile.id,
              user.id
            );
            return done(null, user);
          }

          // Create new user
          const result = db
            .prepare(
              'INSERT INTO users (email, name, google_id, role) VALUES (?, ?, ?, ?)'
            )
            .run(
              profile.emails?.[0]?.value || '',
              profile.displayName || null,
              profile.id,
              'community'
            );

          const newUser = db
            .prepare('SELECT * FROM users WHERE id = ?')
            .get(result.lastInsertRowid) as User & { password_hash?: string };

          return done(null, newUser);
        } catch (error) {
          return done(error, undefined);
        }
      }
    )
  );
  console.log('✅ Google OAuth configured successfully');
} else {
  console.warn('⚠️  Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to enable Google login.');
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser((id: number, done) => {
  try {
    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as User & { password_hash?: string };
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
