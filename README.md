# 🐢 TurtleTracker - Community Turtle Monitoring System

A collaborative web application for monitoring turtle populations through community-driven data collection. This project is developed as part of CM333 (Software Engineering) course, with separate teams handling frontend and backend development.

## 📋 Project Overview

TurtleTracker enables community members and researchers to track turtle populations by scanning and uploading images of turtle plastrons (the underside of turtle shells). The system uses unique shell patterns to identify individual turtles and track their locations over time.

### 🎯 Key Features

#### For Community Members

- **Turtle Scanning**: Upload photos of turtle plastrons for identification
- **Success Notifications**: Receive confirmation when a turtle is successfully logged
- **Community Engagement**: Contribute to wildlife conservation efforts

#### For Research Members (Admins)

- **Detailed Analytics**: View comprehensive turtle tracking data
- **Location History**: See when and where specific turtles were last spotted
- **Population Monitoring**: Access aggregated data for research purposes
- **User Management**: Promote community members to researchers/admins

#### Future Features (Roadmap)

- **Gamification**: Leaderboards and achievements for community members
- **Statistics Dashboard**: Personal and community-wide turtle discovery stats
- **Mobile Apps**: Native Android and iOS applications
- **Advanced Analytics**: Migration patterns, population trends, and research insights

## 🏗️ Project Structure

```
TurtleProject/
├── frontend/          # React + TypeScript frontend application
│   ├── src/
│   │   ├── App.tsx    # Main application component
│   │   ├── main.tsx   # Application entry point
│   │   └── assets/    # Static assets
│   ├── package.json   # Frontend dependencies
│   └── vite.config.ts # Vite configuration
├── auth-backend/      # Authentication backend (separate service)
│   ├── src/           # Backend source code
│   ├── package.json   # Backend dependencies
│   └── README.md      # Auth backend documentation
├── backend/           # Turtle identification backend (to be developed)
│   └── README.md      # Backend team documentation
└── README.md         # This file
```

## 🚀 Technology Stack

### Frontend

- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server
- **Mantine** - Modern React components library
- **Tailwind CSS** - Utility-first CSS framework
- **Tabler Icons** - Beautiful icon set
- **Redux Toolkit** - State management

### Auth Backend

- **Node.js + Express** - Server framework
- **TypeScript** - Type-safe JavaScript
- **SQLite** (Development) / **PostgreSQL** (Production) - Database
- **JWT** - Authentication tokens
- **Passport.js** - Google OAuth integration
- **bcrypt** - Password hashing

### Turtle Identification Backend (Planned)

- To be determined by the backend team

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Quick Start

1. **Clone the repository** (if applicable)

2. **Set up Auth Backend** (see `auth-backend/README.md` for details)

   ```bash
   cd auth-backend
   npm install
   # Create .env file (see auth-backend/README.md)
   npm run create-admin <email> <password> [name]
   npm run dev
   ```

3. **Set up Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` to view the application

### Available Scripts

#### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

#### Auth Backend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run create-admin` - Create initial admin user

## 📖 Usage Guide

### Authentication

#### Registration

All new users are automatically registered as **community members**. To register:

1. Go to `/login` page
2. Click "Sign up" link (or use the API directly)
3. Fill in email, password, and optional name
4. You will be logged in automatically as a community member

#### Login

1. Go to `/login` page
2. Enter your email and password, OR
3. Click "Sign in with Google" for Google OAuth login

#### Creating Initial Admin

To create the first admin user (researcher), use the command line:

```bash
cd auth-backend
npm run create-admin admin@example.com securepassword123 "Admin User"
```

#### Promoting Users to Admin/Researcher

Only existing admins can promote other users. Use the API endpoint:

```bash
curl -X POST http://localhost:3001/api/admin/promote-to-admin \
  -H "Authorization: Bearer <your-admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

Or implement this in the frontend admin dashboard.

### User Roles

- **Community** - Default role for all new users. Can upload turtle photos and view basic information.
- **Admin/Researcher** - Can access admin features, view all users, and promote other users to admin.

### API Endpoints

#### Authentication

- `POST /api/auth/register` - Register new user (always creates as 'community')
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user (requires token)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/google` - Start Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

#### Admin (requires admin authentication)

- `POST /api/admin/promote-to-admin` - Promote a user to admin (admin only)
- `GET /api/admin/users` - Get all users (admin only)

## 🎨 Current Features

The frontend currently includes:

- **Image Upload Interface**: Drag-and-drop image upload with preview
- **File Validation**: Support for common image formats (PNG, JPG, JPEG, GIF, WEBP)
- **Responsive Design**: Mobile-friendly interface using Mantine components
- **Modern UI**: Clean, accessible design with Tailwind CSS styling
- **Authentication**: Login, registration, and Google OAuth integration
- **User Management**: Role-based access control (community/admin)

## 🔮 Development Roadmap

### Phase 1: Core Functionality ✅

- [x] User authentication system
- [x] Database integration (SQLite for dev, PostgreSQL for prod)
- [x] Google OAuth integration
- [x] Role-based access control
- [ ] Backend API development (turtle identification)
- [ ] Turtle image processing and identification

### Phase 2: Community Features

- [x] User registration and profiles
- [ ] Turtle scanning and logging
- [ ] Success notification system
- [ ] Basic analytics dashboard

### Phase 3: Research Tools

- [ ] Advanced analytics for researchers
- [ ] Location tracking and mapping
- [ ] Population monitoring tools
- [ ] Data export capabilities

### Phase 4: Gamification & Mobile

- [ ] Community leaderboards
- [ ] Achievement system
- [ ] Mobile app development
- [ ] Push notifications

## 👥 Team Structure

This project is developed by separate teams:

- **Frontend Team**: Responsible for user interface, user experience, and client-side functionality
- **Auth Backend Team**: Responsible for authentication, user management, and authorization
- **Turtle Identification Backend Team**: Responsible for API development, database design, and turtle identification logic

## 📚 Documentation

- **Main README** (this file) - Project overview and getting started
- **`auth-backend/README.md`** - Detailed authentication backend documentation
- **`backend/README.md`** - Turtle identification backend documentation (for backend team)

## 🔒 Security

- Passwords are hashed with bcrypt
- JWT tokens are used for authentication (7-day expiration)
- CORS is configured for the frontend URL
- Admin endpoints require authentication and admin role
- All new users start as 'community' members (cannot self-promote)

## 🗄️ Database

### Development

- **SQLite** - Local file database (`auth-backend/data/auth.db`)
- Automatically created on first start

### Production

**Important:** For production, you **must** host your database on a server. SQLite is not suitable for production.

**Recommended Options:**
- **Supabase** (Free tier available) - See `auth-backend/README.md`
- **Railway** - Easy PostgreSQL hosting
- **Render** - Simple PostgreSQL hosting
- **Self-hosted PostgreSQL** - Full control

## 🤝 Contributing

This is a course project for CM333 (Software Engineering). Development is coordinated between the frontend, auth backend, and turtle identification backend teams.

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Test thoroughly before submitting changes
- Maintain code documentation
- Keep authentication backend separate from turtle identification backend

## 📄 License

This project is licensed under the terms specified in the LICENSE file.

## 🐢 About Turtle Conservation

Turtle populations worldwide are facing numerous threats including habitat loss, climate change, and human activities. By enabling community members to easily report turtle sightings, this application contributes to:

- **Population Monitoring**: Track turtle numbers and distribution
- **Research Support**: Provide data for scientific studies
- **Conservation Awareness**: Engage communities in wildlife protection
- **Long-term Tracking**: Monitor individual turtle movements and health

---

_Developed with ❤️ for turtle conservation and community engagement_
