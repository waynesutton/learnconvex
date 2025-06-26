# ConvexCourse: Interactive Learning Platform

An AI-powered learning platform designed to teach developers how to build applications with Convex.dev through interactive lessons, voice integration, and comprehensive admin management tools.

## What ConvexCourse Does

ConvexCourse is a production-ready learning platform that makes Convex development accessible through two distinct learning modes:

### 🎯 Core Learning Experience

**Chat Mode**: Interactive AI conversations that guide you through building real Convex applications

- Real-time Q&A with AI instructor powered by OpenAI GPT-4o-mini
- Documentation-enhanced responses using current Convex docs
- Voice interaction with speech-to-text and text-to-speech capabilities
- Progressive learning from basic setup to advanced patterns

**Cards Mode**: Flashcard-style learning for quick concept reinforcement

- Swipe-to-answer flashcards with immediate feedback
- Bite-sized lessons perfect for mobile learning
- Progress tracking with celebration animations
- Admin-configurable question sets

### 🚀 Key Features

#### **AI-Powered Instruction**

- **Documentation-Enhanced AI**: Responses powered by current Convex documentation for accuracy
- **Context-Aware Learning**: AI understands your progress and adapts instruction accordingly
- **Voice Integration**: Full speech-to-text input and text-to-speech output using ElevenLabs
- **AgentFlow Support**: Enhanced AI with persistent conversation context and workflow management

#### **Dynamic Course Management**

- **Real-time Configuration**: Admin-adjustable question counts, scoring, and difficulty levels
- **Live Documentation Updates**: AI instruction updated with latest Convex best practices
- **Session Persistence**: Automatic resume across browser sessions
- **Progress Celebration**: Confetti animations and achievement badges

#### **Comprehensive Admin Tools**

- **Real-time Monitoring**: Live session tracking with message-level visibility
- **Session Intervention**: Insert contextual hints or take over sessions manually
- **Analytics Dashboard**: Usage statistics, completion rates, and cost tracking
- **Bulk Operations**: Efficient management of multiple learning sessions
- **Documentation Management**: Update AI knowledge base through admin interface

#### **Voice-Enabled Learning**

- **Speech Recognition**: Speak your answers instead of typing
- **Audio Responses**: Listen to AI explanations with natural voice synthesis
- **Voice Commands**: Use "skip", "end", and navigation commands
- **Accessibility**: Enhanced learning for diverse accessibility needs

#### **Advanced Features**

- **Document Search**: Upload and search through learning materials
- **Token Analytics**: Track AI usage and costs
- **Clerk Authentication**: Secure admin access with role-based permissions
- **Mobile Optimized**: Responsive design works perfectly on all devices

## Learning Content

The platform teaches practical Convex development through hands-on examples:

- **Project Setup**: `npx create-convex@latest` and initial configuration
- **Schema Design**: Database table definitions and validation
- **Query Functions**: Reading data with real-time subscriptions
- **Mutation Functions**: Writing data with type safety
- **Action Functions**: External API integration and serverless workflows
- **Frontend Integration**: React hooks (`useQuery`, `useMutation`, `useAction`)
- **Deployment**: Production deployment and environment management
- **Best Practices**: Performance optimization and code organization

## Quick Start

### Prerequisites

- Node.js 18+
- OpenAI API key for AI instruction
- ElevenLabs API key for voice features (optional)

### Installation

1. **Clone and install**

   ```bash
   git clone <repository-url>
   cd convex-course
   npm install
   ```

2. **Set up Convex**

   ```bash
   npx convex dev
   ```

3. **Configure environment variables**

   ```bash
   # Required
   VITE_CONVEX_URL=your_convex_deployment_url
   CONVEX_OPENAI_API_KEY=your_openai_api_key

   # Optional - Voice features
   ELEVENLABS_API_KEY=your_elevenlabs_api_key

   # Optional - Admin authentication
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

4. **Start learning**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:5173` and choose your learning mode!

## Usage Guide

### For Learners

1. **Choose Your Mode**

   - **Chat Mode**: Conversational learning with AI instructor
   - **Cards Mode**: Quick flashcard-style review

2. **Interactive Learning**

   - Type responses or use voice input (click microphone icon)
   - Get immediate feedback and explanations
   - Progress through adaptive questioning

3. **Voice Features**

   - Click microphone to speak answers
   - Click speaker icon to hear AI responses
   - Use voice commands: "skip", "end", navigation

4. **Track Progress**
   - View real-time scores and completion progress
   - Celebrate achievements with animations
   - Resume sessions automatically

### For Administrators

Access the admin playground at `/playground` to:

#### **Monitor Learning Sessions**

- View all active and completed sessions in real-time
- See live message exchanges and user progress
- Track completion rates and learning outcomes

#### **Session Intervention**

- Insert contextual hints for struggling learners
- Take over sessions for manual instruction
- Edit or delete messages for content moderation

#### **Configure Courses**

- Adjust question counts and scoring systems
- Update documentation links for AI accuracy
- Manage course difficulty and content focus

#### **Analytics & Insights**

- Track usage patterns and popular features
- Monitor AI token consumption and costs
- Export data for reporting and analysis

#### **Bulk Operations**

- Archive completed sessions
- Delete inactive or test sessions
- Clear message history for privacy

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

## API Configuration

### Environment Variables

**Required:**

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_OPENAI_API_KEY=sk-your-openai-key
```

**Optional:**

```env
# Voice Features
ELEVENLABS_API_KEY=your-elevenlabs-key

# Admin Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_your-clerk-key
CLERK_SECRET_KEY=sk_your-clerk-secret

# AgentFlow (automatically detected)
# No additional configuration needed
```

### Database Initialization

The platform automatically initializes required data on first run:

- Default course settings
- Convex documentation links
- Question banks
- Admin configurations

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start Convex backend
npx convex dev

# Start frontend (in another terminal)
npm run dev:frontend

# Or start both together
npm run dev
```

### Building for Production

```bash
# Build frontend
npm run build

# Deploy Convex functions
npx convex deploy
```

### Testing

```bash
# Type checking
npm run lint

# Build verification
npm run build
```

## Deployment

### Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Convex (Backend)

1. Set up Convex production deployment:

   ```bash
   npx convex deploy --prod
   ```

2. Configure environment variables:
   ```bash
   npx convex env set CONVEX_OPENAI_API_KEY sk-your-key --prod
   npx convex env set ELEVENLABS_API_KEY your-key --prod
   ```

## Key Differentiators

- **No Auth Required**: Anonymous learning experience with optional admin authentication
- **Voice-First Design**: Complete voice interaction capabilities for accessibility
- **Real-time Admin Tools**: Live session monitoring and intervention capabilities
- **Documentation-Enhanced AI**: Always current with latest Convex best practices
- **Dual Learning Modes**: Chat conversations and flashcard-style learning
- **AgentFlow Integration**: Persistent AI context and advanced workflow management
- **Production Ready**: Comprehensive analytics, cost tracking, and scalable architecture

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

Please see `files.md` for detailed architecture documentation.

## Support

- **Documentation**: See `files.md` for comprehensive technical details
- **Issues**: Report bugs via GitHub issues
- **Questions**: Join the Convex Discord community
- **Updates**: Follow [@convex_dev](https://twitter.com/convex_dev) for latest features

## License

This project is open source. See LICENSE file for details.

---

**Built with ❤️ using Convex.dev** • Make something awesome!
