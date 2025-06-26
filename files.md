# ConvexCourse Files Documentation

## Overview

ConvexCourse is an interactive learning platform for teaching developers how to build applications with Convex.dev. The platform offers two distinct learning modes - Chat Mode and Cards Mode - with AI-powered instruction, voice capabilities, admin management tools, and comprehensive analytics.

## Root Configuration Files

### Package Management

- **package.json**: Project dependencies and scripts
  - Core: Convex, React, Vite, TypeScript, TailwindCSS
  - Authentication: Clerk (@clerk/clerk-react)
  - AgentFlow: @convex-dev/agent, @convex-dev/workflow
  - AI Integration: @ai-sdk/openai, openai, zod
  - Voice: ElevenLabs integration for text-to-speech
  - UI: canvas-confetti, react-syntax-highlighter, sonner (toasts)
  - Search: Document chunking and similarity search capabilities

### Build & Development

- **vite.config.ts**: Vite bundler configuration with React plugin and path aliases
- **tsconfig.json**: Main TypeScript configuration
- **tsconfig.app.json**: TypeScript config for application code
- **tsconfig.node.json**: TypeScript config for Node.js code
- **tailwind.config.js**: TailwindCSS configuration with custom Convex branding colors
- **postcss.config.cjs**: PostCSS configuration for TailwindCSS
- **eslint.config.js**: ESLint configuration for code quality
- **components.json**: Shadcn/ui component configuration

### Deployment

- **vercel.json**: Vercel deployment configuration with build settings
- **index.html**: HTML entry point with meta tags, OpenGraph, and Convex favicon

### Project Setup

- **setup.mjs**: Project initialization script

## Convex Backend (`convex/`)

### Core Configuration

- **convex.config.ts**: Convex app configuration with Agent and Workflow components
- **auth.config.ts**: Clerk authentication configuration for Convex with admin role support
- **schema.ts**: Database schema definitions for all tables:
  - `sessions`: Learning session data with AgentFlow support, voice tracking, and admin intervention flags
  - `messages`: Separate message storage with voice message tracking and admin intervention support
  - `courseSettings`: Admin-configurable course parameters (question counts, scoring)
  - `convexDocs`: Documentation management for AI accuracy with content caching
  - `tokenUsage`: AI token consumption tracking for analytics
  - `agentUsage`: AgentFlow-specific token and usage tracking
  - `questions`: Question bank with course type indexing
  - `documents` & `documentChunks`: Document search and similarity matching
  - `playgroundSessions`: AgentFlow playground session tracking

### Main Application Logic

- **course.ts**: Core course functionality and AI integration
  - Session management with randomized questions and voice message tracking
  - AI-powered responses using OpenAI GPT-4o-mini with documentation context
  - Progress tracking and scoring system with dynamic admin-configurable settings
  - Support for two course modes: "Build Apps (Chat Mode)" and "Build Apps (Cards Mode)"
  - Documentation-enhanced AI responses with active Convex docs integration
  - Course settings management with real-time configuration updates
  - Voice message tracking and admin intervention support

### Learning Content

- **questions.ts**: Question bank with randomization utilities
  - Focused on practical Convex development skills
  - Build Apps question sets covering setup, schema, queries, mutations, deployment
  - Randomization functions for varied learning experiences
  - Question metadata with topics and explanations

### AgentFlow Integration

- **agentflow.ts**: AgentFlow integration infrastructure
  - Status tracking and analytics for Agent-powered sessions
  - Enhanced learning workflow management
  - Integration with Convex Agent and Workflow components
- **courseAgent.ts**: Agent-powered response generation
  - Enhanced AI instruction with persistent conversation context
  - Fallback to classic mode for reliability
  - Documentation-enhanced system prompts
  - Session-based Agent thread management (no authentication required)

### Voice Integration

- **voice.ts**: Voice interaction capabilities
  - Text-to-speech using ElevenLabs API
  - Base64 audio generation for real-time playback
  - Speech-to-text placeholder (currently uses browser Web Speech API)
  - Voice command processing integration

### Document Search

- **documentSearch.ts**: Document management and search functionality
  - Document upload and storage with chunking
  - Similarity search capabilities (vector search ready)
  - Document metadata management
  - Content extraction and indexing

### Admin Tools

- **playground.ts**: Comprehensive admin playground functionality
  - Real-time session monitoring with live message tracking
  - Session intervention tools with contextual message insertion
  - Progress manipulation (scores, question advancement)
  - Bulk operations (archive, delete, clear messages)
  - Session takeover for manual instruction
  - Admin statistics and analytics
  - Message editing and deletion capabilities

### Analytics & Monitoring

- **stats.ts**: Learning analytics and statistics
  - Course completion metrics by mode (Chat/Cards)
  - Score distribution analysis with difficulty tracking
  - Token usage tracking for AI interactions and cost analysis
  - Recent activity feeds and user engagement metrics
  - Completion rate tracking across course types

### HTTP Routing

- **http.ts**: HTTP routes configuration (minimal setup for potential future API endpoints)
- **router.ts**: HTTP router setup

## Frontend (`src/`)

### Main Application

- **main.tsx**: React app entry point with Clerk authentication providers and ConvexProvider
- **App.tsx**: Main learning application component
  - Two learning modes: Chat Mode (interactive AI conversation) and Cards Mode (flashcard-style)
  - Dynamic course selection with real-time settings from database
  - Voice interaction support with speech recognition and text-to-speech
  - Progress tracking with dynamic question counts and scoring
  - Celebration animations with confetti and badge system
  - Session persistence with localStorage backup
  - AgentFlow integration toggle for enhanced AI experience
- **AppRouter.tsx**: React Router configuration with protected admin routes

### Authentication & Access Control

- **components/AdminLogin.tsx**: Admin authentication page with Clerk integration
- **components/AdminRoute.tsx**: Admin role protection wrapper component
- **components/NotFound.tsx**: 404 error page for unauthorized access

### Learning Interface Components

- **components/DuolingoCards.tsx**: Card-based learning interface

  - Swipe-to-answer functionality with visual feedback animations
  - Dynamic question counts and scoring based on admin settings
  - Progress indicators using database-driven totals
  - Admin hint integration for contextual help
  - Completion tracking with celebration system

- **components/MessageRenderer.tsx**: Chat message rendering

  - Markdown support with syntax highlighting
  - Code block rendering with copy functionality
  - Message role differentiation (user/assistant/admin)
  - Voice message indicators and admin intervention flags

- **components/CodeBlock.tsx**: Syntax-highlighted code display
  - Copy to clipboard functionality
  - Multiple language support
  - Convex-specific syntax highlighting

### Admin & Management Tools

- **components/Playground.tsx**: Admin playground interface

  - Real-time session monitoring with live updates
  - Session intervention tools with contextual targeting
  - Progress manipulation controls (scores, questions)
  - Message editing and deletion capabilities
  - Bulk operations for session management
  - User session analytics and statistics
  - Voice message tracking and admin notes

- **components/CourseSettingsPage.tsx**: Course configuration interface

  - Course settings management for both learning modes
  - Documentation links management with CRUD operations
  - Real-time content refresh from external documentation URLs
  - Default documentation integration (docs.convex.dev)
  - Settings validation and error handling

- **components/DocumentSearch.tsx**: Document management interface
  - Document upload with file type validation
  - Full-text search across uploaded documents
  - Document metadata display and management
  - Delete functionality with confirmation dialogs
  - Search result scoring and relevance display

### Analytics & Reporting

- **components/Stats.tsx**: Learning analytics dashboard
  - Overall course completion statistics and trends
  - Score distribution charts and performance metrics
  - Recent activity feeds with user engagement tracking
  - Course mode comparison (Chat vs Cards performance)
  - Real-time data visualization with responsive design
  - Token usage tracking and cost analysis visualization

### UI Components & Utilities

- **components/Modal.tsx**: Reusable modal component with overlay

  - Customizable content areas and action buttons
  - Keyboard navigation and accessibility support
  - Used for confirmations, settings, and detailed views

- **lib/utils.ts**: Utility functions for common operations
  - CSS class merging with Tailwind utilities
  - Data formatting and validation helpers
  - Shared constants and configuration values

### Type Definitions

- **speech-recognition.d.ts**: TypeScript definitions for Web Speech API

  - Browser speech recognition interface declarations
  - Cross-browser compatibility type definitions
  - Voice command and transcription type safety

- **vite-env.d.ts**: Vite environment type definitions for development

## Documentation Files

### Project Documentation

- **README.md**: Comprehensive project overview and setup guide

  - Feature descriptions and learning mode explanations
  - Installation instructions with environment variable setup
  - Usage guides for both learners and administrators
  - Technical architecture documentation
  - Deployment and maintenance information

- **agentflow.md**: AgentFlow integration documentation

  - Implementation patterns for Agent and Workflow components
  - Benefits of combining AgentFlow with Convex for learning platforms
  - Technical deep-dive into persistent conversation context
  - Best practices for multi-step AI workflows

- **betterauthcourse.md**: Better Auth integration course materials

  - Alternative authentication implementation examples
  - Comparison with Clerk authentication
  - Security patterns and best practices

- **TASKS.md**: Development task tracking and feature roadmap

  - Current sprint objectives and completed features
  - Bug tracking and resolution status
  - Future enhancement planning and priorities

- **files.md**: This file - comprehensive codebase documentation
  - Detailed explanation of every component and its purpose
  - Architecture decisions and implementation patterns
  - Developer onboarding and contribution guidelines

## Technical Architecture

### Backend (Convex)

- **Reactive Database**: Real-time synchronization across all components
- **Type-Safe Functions**: Full TypeScript coverage with Convex validators
- **AgentFlow Integration**: Enhanced AI with persistent context and workflows
- **Serverless Architecture**: Automatic scaling and global edge distribution

### Frontend (React + TypeScript)

- **Modern React**: Hooks, suspense, and real-time updates
- **Voice Integration**: Web Speech API + ElevenLabs synthesis
- **Responsive Design**: Mobile-first with TailwindCSS
- **Real-time UI**: Live updates via Convex reactive queries

### AI & Voice

- **OpenAI GPT-4o-mini**: Primary AI instruction engine
- **ElevenLabs**: High-quality text-to-speech synthesis
- **Documentation Context**: AI responses enhanced with current Convex docs
- **AgentFlow**: Persistent conversation context and workflow management

### Authentication & Security

- **Clerk**: Production-ready authentication with admin roles
- **Anonymous Learning**: No auth required for core learning experience
- **Role-based Access**: Admin tools protected behind authentication
- **Session Security**: Secure session management with intervention controls

### Analytics & Monitoring

- **Real-time Metrics**: Live session monitoring and progress tracking
- **Cost Tracking**: AI token usage and financial analytics
- **Performance Monitoring**: Response times and system health
- **User Analytics**: Learning patterns and engagement metrics

### Deployment

- **Vercel**: Frontend hosting with automatic deployments
- **Convex Cloud**: Backend hosting with global distribution
- **Environment Management**: Secure configuration for production and development
- **CI/CD**: Automated testing and deployment pipelines
