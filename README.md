# 🐢 TurtleTracker - Community Turtle Monitoring System

A collaborative web application for monitoring turtle populations through community-driven data collection. This project is developed as part of CM333 (Software Engineering) course, with separate teams handling frontend and backend development.

## 📋 Project Overview

TurtleTracker enables community members and researchers to track turtle populations by scanning and uploading images of turtle plastrons (the underside of turtle shells). The system uses unique shell patterns to identify individual turtles and track their locations over time.

### 🎯 Key Features

#### For Community Members

- **Turtle Scanning**: Upload photos of turtle plastrons for identification
- **Success Notifications**: Receive confirmation when a turtle is successfully logged
- **Community Engagement**: Contribute to wildlife conservation efforts

#### For Research Members

- **Detailed Analytics**: View comprehensive turtle tracking data
- **Location History**: See when and where specific turtles were last spotted
- **Population Monitoring**: Access aggregated data for research purposes

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
├── backend/           # Backend API (to be developed)
│   └── backend.txt    # Placeholder file
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

### Backend (Planned)

- To be determined by the backend team

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn package manager

### Frontend Setup

1. **Navigate to the frontend directory:**

   ```bash
   cd frontend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:5173` to view the application

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 Current Features

The frontend currently includes:

- **Image Upload Interface**: Drag-and-drop image upload with preview
- **File Validation**: Support for common image formats (PNG, JPG, JPEG, GIF, WEBP)
- **Responsive Design**: Mobile-friendly interface using Mantine components
- **Modern UI**: Clean, accessible design with Tailwind CSS styling

## 🔮 Development Roadmap

### Phase 1: Core Functionality

- [ ] Backend API development
- [ ] Turtle image processing and identification
- [ ] User authentication system
- [ ] Database integration

### Phase 2: Community Features

- [ ] User registration and profiles
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

This project is developed by two separate teams:

- **Frontend Team**: Responsible for user interface, user experience, and client-side functionality
- **Backend Team**: Responsible for API development, database design, and server-side logic

## 🤝 Contributing

This is a course project for CM333 (Software Engineering). Development is coordinated between the frontend and backend teams.

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Test thoroughly before submitting changes
- Maintain code documentation

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
