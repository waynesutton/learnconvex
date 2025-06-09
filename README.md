# Convex Learning Course App

A comprehensive interactive learning platform for mastering Convex.dev fundamentals and practical application development. This app provides two distinct learning paths: understanding how Convex works conceptually and hands-on application building.

## What This App Is About

This is an AI-powered educational platform that teaches Convex.dev through interactive courses. The app features:

### 🎯 Two Learning Tracks

1. **"Build Apps"** - Practical development skills and workflows

### 🤖 AI-Powered Learning

- Interactive AI instructor that adapts to your learning pace
- Real-time feedback and scoring system
- Code examples with syntax highlighting
- Progress tracking through configurable question sets
- **Randomized Question Order** - Each session presents questions in a unique order for varied learning experiences

### ✨ Gamified Experience

- Dynamic scoring system (0-100 points)
- Celebration animations with confetti effects
- Achievement badges for progress milestones
- Engaging UI with modern black and white design
- Branded thinking indicator with spinning Convex favicon

### 🔑 Key Features

- **Anonymous Authentication** - Easy sign-in with Convex Auth
- **Real-time Sync** - Live chat interface powered by Convex reactivity
- **Session Management** - Persistent learning progress
- **Learning Analytics** - Comprehensive stats page with course completion tracking
- **Responsive Design** - Beautiful, production-ready interface
- **Code Highlighting** - Syntax-highlighted code examples for better learning

## Technical Stack

This project is built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.

- **Frontend**: React 19 + Vite + TypeScript + TailwindCSS
- **Backend**: Convex.dev with real-time database
- **AI Integration**: OpenAI GPT for interactive course content
- **Authentication**: Convex Auth with anonymous login
- **UI Components**: Custom components with Tailwind styling
- **Animations**: Canvas Confetti for celebrations

## Project Structure

```
convexcourse/
├── convex/                     # Backend Convex functions and configuration
│   ├── _generated/            # Auto-generated Convex types and API
│   ├── auth.config.ts         # Authentication configuration
│   ├── auth.ts               # Auth setup and handlers
│   ├── course.ts             # Main course logic and AI integration
│   ├── http.ts              # HTTP routes configuration
│   ├── router.ts            # Custom HTTP route definitions
│   ├── schema.ts            # Database schema definitions
│   ├── stats.ts             # Learning analytics and statistics queries
│   └── tsconfig.json        # TypeScript config for Convex
├── src/                      # Frontend React application
│   ├── components/          # Reusable UI components
│   │   ├── CodeBlock.tsx    # Syntax-highlighted code display
│   │   ├── MessageRenderer.tsx # Chat message rendering
│   │   └── Stats.tsx        # Learning statistics page
│   ├── lib/                 # Utility libraries
│   ├── App.tsx              # Main application component
│   ├── AppRouter.tsx        # React Router setup
│   ├── SignInForm.tsx       # Authentication form
│   ├── SignOutButton.tsx    # Sign out functionality
│   ├── index.css           # Global styles and Tailwind imports
│   ├── main.tsx            # React app entry point
│   ├── vite-env.d.ts       # Vite type definitions
│   └── vite.config.ts      # Vite bundler configuration
├── components.json          # Shadcn/ui component configuration
├── eslint.config.js        # ESLint configuration
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts
├── postcss.config.cjs      # PostCSS configuration
├── setup.mjs               # Project setup script
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.app.json       # TypeScript config for app
├── tsconfig.json           # Main TypeScript configuration
├── tsconfig.node.json      # TypeScript config for Node.js
└── vite.config.ts          # Vite bundler configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager

### Installation & Development

1. **Clone and install dependencies:**

   ```bash
   git clone <repository-url>
   cd convexcourse
   npm install
   ```

2. **Start development servers:**

   ```bash
   npm run dev
   ```

   This runs both frontend (Vite) and backend (Convex) servers concurrently.

3. **Available Scripts:**
   - `npm run dev` - Start both frontend and backend servers
   - `npm run dev:frontend` - Start only the Vite frontend server
   - `npm run dev:backend` - Start only the Convex backend server
   - `npm run lint` - Run TypeScript and build checks

## App Architecture

### Frontend (`src/`)

The frontend is built with Vite and React, featuring a modern chat-style interface for the learning experience.

### Backend (`convex/`)

The backend uses Convex for real-time functionality, with the main course logic handling AI interactions and progress tracking.

## App Authentication

This app uses [Convex Auth](https://auth.convex.dev/) with Anonymous authentication for easy sign-in. You may wish to change this before deploying your app to production.

## Course Configuration

The app supports configurable course settings in `convex/course.ts`:

```typescript
const COURSE_SETTINGS = {
  "how-convex-works": {
    totalQuestions: 10, // Adjustable
    maxScore: 100,
  },
  "build-apps": {
    totalQuestions: 7, // Adjustable
    maxScore: 100,
  },
};
```

### Question Randomization

Each learning session generates a unique randomized question order to ensure varied learning experiences:

- **Structured Question Bank** (`convex/questions.ts`) - Predefined questions with answers, explanations, and topic tags
- **Session-Based Randomization** - Question order is randomized when a new session starts
- **Consistent Learning Path** - Each user follows their randomized order throughout their session
- **Course-Specific Questions** - Different question sets for conceptual vs. practical learning tracks

This approach maintains the integrity of the "learn Convex journey" while providing fresh experiences for returning users.

## Learning Analytics

The app includes a comprehensive statistics page at `/stats` that tracks:

- **Course Completion Metrics** - Total sessions started vs completed
- **Scoring Analytics** - Average scores across all courses and by mode
- **Learning Progress** - Questions answered, skipped, and estimated accuracy
- **Course Mode Breakdown** - Usage distribution between Chat Mode, Cards Mode, and How Convex Works
- **Recent Activity Feed** - Latest learning sessions with scores and progress
- **Score Distribution** - Visual representation of score ranges across all users

The stats page is publicly accessible and provides valuable insights into learning patterns and course effectiveness. Access it via the "Stats" link in the footer of any page.

## Developing and Deploying Your App

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.

- If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
- Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
- Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve your app further

## HTTP API

User-defined HTTP routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.

## Contributing

This is a learning platform designed to teach Convex.dev concepts. Feel free to extend the courses, add new learning tracks, or improve the user experience.

# learnconvex
