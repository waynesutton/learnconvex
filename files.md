# Files Overview

This document provides a comprehensive overview of all the files in the Convex Learning Course App codebase and their purposes.

## Root Configuration Files

### `package.json`

- **Purpose**: Defines project dependencies, scripts, and metadata
- **Key Dependencies**: React 19, Convex, OpenAI, TailwindCSS, TypeScript
- **Scripts**: Development, build, and linting commands

### `vite.config.ts`

- **Purpose**: Vite bundler configuration for the frontend
- **Features**: React plugin setup, development server configuration

### `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json`

- **Purpose**: TypeScript compiler configurations for different environments
- **Scope**: Main config, app-specific config, and Node.js-specific config

### `tailwind.config.js`

- **Purpose**: TailwindCSS configuration with custom design system
- **Features**: Custom colors, fonts, and design tokens

### `postcss.config.cjs`

- **Purpose**: PostCSS configuration for CSS processing
- **Plugins**: Tailwind and Autoprefixer integration

### `eslint.config.js`

- **Purpose**: ESLint configuration for code quality and consistency
- **Rules**: React, TypeScript, and modern JavaScript standards

### `components.json`

- **Purpose**: Shadcn/ui component library configuration
- **Features**: Component styling and path configuration

### `setup.mjs`

- **Purpose**: Project setup script for initial configuration
- **Function**: Automates project initialization steps

### `index.html`

- **Purpose**: HTML entry point for the Vite application
- **Content**: Basic HTML structure and root div for React mounting

## Frontend Source Files (`src/`)

### `src/main.tsx`

- **Purpose**: React application entry point
- **Function**: Renders the root App component and sets up ConvexProvider

### `src/App.tsx`

- **Purpose**: Main application component with course interface
- **Features**:
  - Course selection (How Convex Works vs Build Apps)
  - Real-time chat interface with AI instructor
  - Session management and progress tracking
  - Celebration animations and gamification
  - Completion page with course summary

### `src/AppRouter.tsx`

- **Purpose**: Main routing component using React Router
- **Features**: Routes between main app and stats page

### `src/SignInForm.tsx`

- **Purpose**: User authentication form component
- **Features**: Anonymous sign-in with Convex Auth integration

### `src/SignOutButton.tsx`

- **Purpose**: Sign-out functionality component
- **Function**: Handles user logout from Convex Auth

### `src/index.css`

- **Purpose**: Global CSS styles and TailwindCSS imports
- **Features**: Custom CSS variables and base styling

### `src/vite-env.d.ts`

- **Purpose**: TypeScript declarations for Vite environment
- **Function**: Provides type definitions for Vite-specific features

## Frontend Components (`src/components/`)

### `src/components/MessageRenderer.tsx`

- **Purpose**: Renders chat messages with rich formatting
- **Features**:
  - Markdown parsing and rendering
  - Syntax highlighting for code blocks
  - User vs assistant message styling
  - Timestamp display

### `src/components/CodeBlock.tsx`

- **Purpose**: Specialized component for rendering code with syntax highlighting
- **Features**:
  - Multiple language support
  - Copy-to-clipboard functionality
  - Themed syntax highlighting

### `src/components/Stats.tsx`

- **Purpose**: Public statistics page showing learning analytics
- **Features**:
  - Overall course completion and scoring statistics
  - Course mode breakdowns (Chat/Cards/How Convex Works)
  - Score distribution charts
  - Recent learning activity feed
  - Estimated correct/incorrect answer tracking

## Backend Convex Functions (`convex/`)

### `convex/schema.ts`

- **Purpose**: Database schema definitions for Convex
- **Tables**:
  - `sessions`: User learning sessions with progress tracking
  - Auth tables from Convex Auth
- **Features**: Indexes for efficient querying

### `convex/course.ts`

- **Purpose**: Main course logic and AI integration
- **Functions**:
  - `createSession`: Initialize new learning sessions with randomized question order
  - `getSession`: Retrieve session data
  - `addMessage`: Add messages to chat history
  - `updateSession`: Update session progress and scores
  - `generateResponse`: AI-powered response generation using OpenAI with structured questions
  - `getCurrentQuestion`: Get the current question for a session based on randomized order
  - `getRandomizedQuestions`: Get all questions for cards mode in randomized order
- **Features**:
  - Configurable course settings
  - Two distinct course tracks with different system prompts
  - Progress tracking and scoring algorithms
  - Randomized question ordering for each new session
  - Structured question system with predefined answers and explanations

### `convex/questions.ts`

- **Purpose**: Shared question bank and randomization utilities
- **Exports**:
  - `HOW_CONVEX_WORKS_QUESTIONS`: Conceptual questions about Convex fundamentals
  - `BUILD_APPS_QUESTIONS`: Practical development questions and commands
  - `getQuestionsForCourse`: Get questions array for specific course type
  - `shuffleQuestions`: Utility to randomize question order
  - `generateRandomizedQuestionOrder`: Generate randomized indices for questions
- **Features**:
  - Structured question format with topics, answers, and explanations
  - Different question sets for different course types
  - Randomization utilities for varied learning experiences

### `convex/auth.config.ts`

- **Purpose**: Authentication configuration for Convex Auth
- **Features**: Provider setup and authentication flows

### `convex/auth.ts`

- **Purpose**: Authentication implementation and handlers
- **Function**: Sets up Convex Auth with anonymous authentication

### `convex/http.ts`

- **Purpose**: HTTP routes configuration
- **Function**: Sets up HTTP endpoints and integrates with auth

### `convex/router.ts`

- **Purpose**: Custom HTTP route definitions
- **Function**: Defines user-specific HTTP endpoints separate from auth routes

### `convex/stats.ts`

- **Purpose**: Statistics and analytics queries for the stats page
- **Functions**:
  - `getOverallStats`: Aggregates course completion, scoring, and user engagement data
  - `getRecentActivity`: Returns recent learning sessions for activity feed
  - `getScoreDistribution`: Provides score range distribution for data visualization

### `convex/tsconfig.json`

- **Purpose**: TypeScript configuration specifically for Convex functions
- **Features**: Convex-specific compiler options and path mappings

## Auto-Generated Files (`convex/_generated/`)

### `convex/_generated/api.ts`

- **Purpose**: Auto-generated API client for frontend-backend communication
- **Function**: Provides type-safe function references for queries, mutations, and actions

### `convex/_generated/server.ts`

- **Purpose**: Auto-generated server-side utilities and types
- **Function**: Provides server context types and function registration helpers

### `convex/_generated/dataModel.ts`

- **Purpose**: Auto-generated database types based on schema
- **Function**: Provides TypeScript types for all database tables and documents

## Utility Directories

### `src/lib/`

- **Purpose**: Utility functions and shared libraries
- **Status**: Currently empty but reserved for future utility functions

### `.cursor/`

- **Purpose**: Cursor AI editor configuration and rules
- **Content**: Custom AI coding assistant rules and preferences

## Hidden/System Files

### `.DS_Store`

- **Purpose**: macOS system file for folder display preferences
- **Note**: Should be in `.gitignore`

### `.gitignore`

- **Purpose**: Specifies which files Git should ignore
- **Content**: Node modules, build outputs, environment files, and system files

### `package-lock.json`

- **Purpose**: Locked dependency versions for reproducible builds
- **Function**: Ensures consistent dependency installation across environments

## Key File Relationships

1. **Frontend-Backend Communication**:

   - `src/App.tsx` → `convex/_generated/api.ts` → `convex/course.ts`

2. **Database Schema**:

   - `convex/schema.ts` → `convex/_generated/dataModel.ts` → TypeScript types

3. **Authentication Flow**:

   - `src/SignInForm.tsx` → `convex/auth.ts` → `convex/auth.config.ts`

4. **Styling Pipeline**:

   - `src/index.css` → `tailwind.config.js` → `postcss.config.cjs`

5. **Build Process**:
   - `vite.config.ts` → `tsconfig.app.json` → Built application

This file structure follows Convex best practices with clear separation between frontend React code and backend Convex functions, enabling real-time reactivity and type safety throughout the application.
