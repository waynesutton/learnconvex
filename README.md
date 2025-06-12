# Convex Learning Course App

A comprehensive interactive learning platform for mastering Convex.dev fundamentals and practical application development. This app provides two distinct learning paths: understanding how Convex works conceptually and hands-on application building.

## 🚀 Production Ready & Type Safe

This app is **fully type-safe** and **deployment-ready** for Vercel with:

- ✅ **Complete Type Safety**: All Convex functions have proper argument and return validators
- ✅ **Production Build**: Optimized build configuration with Vite and Convex integration
- ✅ **Vercel Deployment**: Pre-configured with `vercel.json` and proper build commands
- ✅ **Environment Variables**: Documented and configured for production deployment
- ✅ **Error Handling**: Comprehensive error handling throughout the application
- ✅ **TypeScript Strict Mode**: Enforced across all configurations for maximum reliability

## What This App Is About

This is an intelligent educational platform that teaches Convex.dev through interactive courses powered by advanced AI technology. The app features:

### 🎯 Two Learning Modes

1. **"How Convex Works"** - Conceptual understanding of Convex fundamentals and architecture (10 questions)
2. **"Build Apps"** - Practical development skills and workflows (7 questions)

### 🤖 Smart AI Learning

- Interactive AI instructor that adapts to your learning pace
- Real-time feedback and scoring system
- Code examples with syntax highlighting
- Progress tracking through configurable question sets
- **Randomized Question Order** - Each session presents questions in a unique order for varied learning experiences
- **Smart Skip Handling** - Users can skip questions while still receiving explanations

### ✨ Gamified Experience

- Dynamic scoring system (0-100 points)
- Celebration animations with confetti effects
- Achievement badges for progress milestones
- Engaging UI with modern black and white design
- Branded thinking indicator with spinning Convex favicon

### 🔑 Key Features

- **Anonymous Authentication** - Easy sign-in with Convex Auth
- **Real-time Sync** - Live chat interface powered by Convex reactivity
- **Session Management** - Persistent learning progress with randomized question orders
- **Learning Analytics** - Comprehensive stats page with course completion tracking
- **Responsive Design** - Beautiful, production-ready interface
- **Code Highlighting** - Syntax-highlighted code examples for better learning
- **Multiple Learning Modes** - Chat mode and Cards mode for different learning preferences

## Technical Stack

This project is built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.

- **Frontend**: React 19 + Vite + TypeScript + TailwindCSS
- **Backend**: Convex.dev with real-time database and type-safe functions
- **AI Integration**: OpenAI GPT-4 for interactive course content
- **Authentication**: Convex Auth with anonymous login
- **UI Components**: Custom components with Tailwind styling
- **Animations**: Canvas Confetti for celebrations
- **Deployment**: Vercel with optimized Convex integration

## Project Structure

```
convexcourse/
├── convex/                     # Backend Convex functions and configuration
│   ├── _generated/            # Auto-generated Convex types and API
│   ├── auth.config.ts         # Authentication configuration
│   ├── auth.ts               # Auth setup and handlers (TYPE-SAFE)
│   ├── course.ts             # Main course logic and AI integration (TYPE-SAFE)
│   ├── http.ts              # HTTP routes configuration
│   ├── router.ts            # Custom HTTP route definitions
│   ├── schema.ts            # Database schema definitions
│   ├── stats.ts             # Learning analytics and statistics queries (TYPE-SAFE)
│   ├── questions.ts         # Question bank with randomization utilities
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
├── vercel.json              # Vercel deployment configuration
├── components.json          # Shadcn/ui component configuration
├── eslint.config.js        # ESLint configuration
├── index.html              # HTML entry point
├── package.json            # Dependencies and scripts (Deployment Ready)
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
   - `npm run build` - Build for production (Vercel-ready)
   - `npm run preview` - Preview production build locally
   - `npm run lint` - Run TypeScript and build checks

## App Architecture

### Frontend (`src/`)

The frontend is built with Vite and React, featuring a modern chat-style interface for the learning experience with full TypeScript support.

### Backend (`convex/`)

The backend uses Convex for real-time functionality, with the main course logic handling AI interactions and progress tracking. **All functions are type-safe with proper validators.**

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

## 🚀 Deploying to Vercel

This app is pre-configured for seamless Vercel deployment following [Convex's Vercel deployment guide](https://docs.convex.dev/production/hosting/vercel).

### Quick Deployment Steps:

1. **Connect to Vercel**: Link your GitHub repository to Vercel
2. **Set Environment Variables**:
   - `CONVEX_DEPLOY_KEY` - Get from Convex Dashboard → Settings → Deploy Keys
   - `CONVEX_OPENAI_API_KEY` - Your OpenAI API key
3. **Deploy**: Vercel will automatically use the optimized build configuration

### Build Configuration

The app uses the recommended Vercel build command:

```bash
npx convex deploy --cmd 'npm run build'
```

This ensures both your Convex backend and React frontend are deployed together.

## Environment Variables

Required for production deployment:

- `CONVEX_DEPLOY_KEY`: Production deploy key from Convex Dashboard
- `CONVEX_OPENAI_API_KEY`: OpenAI API key for AI course content
- `CONVEX_URL`: Automatically set by Convex during deployment

## Type Safety Features

This app implements comprehensive type safety:

- **Convex Functions**: All queries, mutations, and actions have proper argument and return validators
- **Database Schema**: Fully typed with Convex's schema validation
- **Frontend Types**: Full TypeScript coverage with strict mode enabled
- **API Integration**: Type-safe communication between frontend and backend
- **Error Handling**: Proper error types and validation throughout

## Developing and Deploying Your App

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.

- If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
- Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
- Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve your app further
- For Vercel deployment specifically, see the [Vercel Guide](https://docs.convex.dev/production/hosting/vercel)

## HTTP API

User-defined HTTP routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.

## Contributing

This is a learning platform designed to teach Convex.dev concepts. Feel free to extend the courses, add new learning tracks, or improve the user experience.

## Deployment Checklist

- ✅ All TypeScript errors resolved
- ✅ All Convex functions have proper validators
- ✅ Build process tested and working
- ✅ Environment variables documented
- ✅ Vercel configuration optimized
- ✅ Production-ready error handling
- ✅ Database schema validated
- ✅ AI integration properly configured

# learnconvex
