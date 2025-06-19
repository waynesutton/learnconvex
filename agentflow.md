# AgentFlow: Combining Convex Agent and Workflow Components

This document outlines the benefits and implementation patterns for using Convex's Agent and Workflow components together to build robust, scalable AI-powered applications with durable execution.

## Current State: ConvexCourse Learning Platform

The ConvexCourse app currently implements a traditional AI chat system with:

- **Direct OpenAI API calls** in `convex/course.ts`
- **Simple session management** with basic state tracking
- **Manual progress tracking** through score calculations
- **Linear interaction flow** with basic Q&A patterns
- **In-memory conversation context** stored in session messages

While functional, this approach has limitations in terms of scalability, reliability, and advanced AI capabilities.

## The Power of AgentFlow: Agent + Workflow

Combining the Agent and Workflow components creates a powerful foundation for building sophisticated AI applications that can handle complex, multi-step processes with reliability guarantees.

### Key Benefits

#### 1. **Durable AI Conversations**

- **Automatic conversation persistence** across sessions and restarts
- **Built-in memory management** with vector search for context retrieval
- **Resilient to failures** - conversations continue where they left off
- **Multi-agent support** - different agents for different learning modes

#### 2. **Complex Learning Workflows**

- **Multi-step learning processes** that survive server restarts
- **Parallel processing** of different course modules
- **Conditional branching** based on user performance
- **Automatic retry mechanisms** for failed operations
- **Long-running processes** that can span days or weeks

#### 3. **Enhanced User Experience**

- **Real-time reactive updates** for workflow progress
- **Cancellable operations** for long-running tasks
- **Detailed progress monitoring** with step-by-step visibility
- **Seamless error recovery** without losing context

#### 4. **Scalable Architecture**

- **Horizontal scaling** with built-in parallelism controls
- **Resource optimization** through intelligent batching
- **Token usage tracking** and rate limiting
- **Modular design** for easy maintenance and extension

## Implementation Architecture

### Core Components Integration

First, install the required components:

```bash
npm install @convex-dev/agent @convex-dev/workflow
```

Then configure your `convex/convex.config.ts`:

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";
import workflow from "@convex-dev/workflow/convex.config";

const app = defineApp();
app.use(agent);
app.use(workflow);

export default app;
```

### **No Authentication Required**

The AgentFlow implementation works without user authentication by using **session-based identification**, just like your current ConvexCourse app. Instead of requiring users to sign in, we use:

- **Session IDs**: Anonymous session identifiers (e.g., `session_1234567890_abc123`)
- **Agent Threads**: Tied to sessions instead of authenticated users
- **Workflows**: Track learning progress by session, not user account

This maintains the current "jump right in" user experience while adding powerful AI capabilities.

### **Session-Based Implementation Pattern**

```typescript
// Example: Anonymous session-based Agent thread creation
const createAnonymousThread = async (sessionId: string, courseType: string) => {
  const { threadId } = await convexLearningAgent.createThread(ctx, {
    userId: sessionId, // sessionId acts as anonymous user identifier
    metadata: {
      isAnonymous: true,
      courseType,
      sessionId,
      createdAt: Date.now(),
    },
  });
  return threadId;
};

// Example: Anonymous workflow start
const startAnonymousWorkflow = async (sessionId: string) => {
  const workflowId = await learningWorkflow.start(
    ctx,
    internal.learning.comprehensiveLearningSession,
    {
      sessionId, // Using session ID instead of user ID
      userId: sessionId, // Agent component still needs an identifier
      isAnonymous: true,
    }
  );
  return workflowId;
};
```

Now create the AgentFlow architecture in `convex/agentflow.ts`:

```typescript
// convex/agentflow.ts
import { Agent, createTool } from "@convex-dev/agent";
import { WorkflowManager } from "@convex-dev/workflow";
import { components } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getQuestionsForCourse, type Question } from "./questions";

// Initialize Agent with ConvexCourse-specific configuration
const convexLearningAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions: `You are an expert Convex.dev instructor helping users learn through interactive courses. 
  You have access to structured question banks and can provide accurate, contextual responses based on 
  the current learning objective.`,

  tools: {
    // Tool to get the current question and expected answer
    getQuestionContext: createTool({
      description: "Get the current question context for accurate teaching",
      args: z.object({
        courseType: z.string(),
        questionIndex: z.number(),
      }),
      handler: async (ctx, args): Promise<Question | null> => {
        const questions = getQuestionsForCourse(args.courseType);
        return questions[args.questionIndex] || null;
      },
    }),

    // Tool to assess learning progress
    assessAnswer: createTool({
      description: "Assess if user's answer contains expected concepts",
      args: z.object({
        userAnswer: z.string(),
        expectedAnswer: z.string(),
        topics: z.array(z.string()),
      }),
      handler: async (
        ctx,
        args
      ): Promise<{
        isCorrect: boolean;
        score: number;
        feedback: string;
      }> => {
        const userLower = args.userAnswer.toLowerCase();
        const expectedLower = args.expectedAnswer.toLowerCase();

        // Check if key concepts are present
        const hasExpectedConcepts = expectedLower
          .split(" ")
          .some((word) => word.length > 3 && userLower.includes(word));

        const score = hasExpectedConcepts
          ? Math.max(7, Math.min(10, Math.floor(userLower.length / 10)))
          : Math.max(3, Math.floor(userLower.length / 20));

        return {
          isCorrect: hasExpectedConcepts,
          score,
          feedback: hasExpectedConcepts
            ? "Great answer! You've grasped the key concepts."
            : "Good effort! Let me help clarify the key points.",
        };
      },
    }),

    // Tool to track and update session progress
    updateProgress: createTool({
      description: "Update learning session progress and score",
      args: z.object({
        sessionId: z.string(),
        scoreIncrement: z.number(),
        questionAdvance: z.boolean(),
      }),
      handler: async (ctx, args): Promise<{ success: boolean }> => {
        // This would integrate with your existing session management
        await ctx.runMutation(api.course.updateSession, {
          sessionId: args.sessionId,
          score: args.scoreIncrement,
          currentQuestion: args.questionAdvance ? 1 : 0,
        });
        return { success: true };
      },
    }),
  },

  maxSteps: 5,
  contextOptions: {
    maxMessages: 20,
    includeUserHistory: true,
  },

  // Track token usage for analytics
  usageHandler: async (ctx, { model, usage, userId }) => {
    await ctx.runMutation(api.stats.trackTokenUsage, {
      userId,
      model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    });
  },
});

// Initialize Workflow Manager for durable learning processes
const learningWorkflow = new WorkflowManager(components.workflow, {
  defaultRetryBehavior: {
    maxAttempts: 3,
    initialBackoffMs: 1000,
    base: 2,
  },
  workpoolOptions: {
    maxParallelism: 5, // Conservative for educational workloads
  },
});

export { convexLearningAgent, learningWorkflow };
```

### Enhanced Learning Session Management

Instead of the current simple session model, AgentFlow enables:

```typescript
// Durable Learning Workflow
export const learningWorkflow = workflow.define({
  args: {
    userId: v.string(),
    courseType: v.string(),
    sessionId: v.string(),
  },
  handler: async (step, args): Promise<LearningResults> => {
    // Step 1: Initialize learning thread with Agent
    const { threadId } = await step.runMutation(internal.agent.createLearningThread, {
      userId: args.userId,
      courseType: args.courseType,
      sessionId: args.sessionId,
    });

    // Step 2: Personalized learning path generation
    const learningPath = await step.runAction(
      internal.agent.generateLearningPath,
      { threadId, courseType: args.courseType },
      { retry: true }
    );

    // Step 3: Parallel content delivery and assessment
    const [contentDelivery, progressTracking] = await Promise.all([
      step.runAction(internal.agent.deliverContent, { threadId, learningPath }, { runAfter: 0 }),
      step.runAction(
        internal.agent.trackProgress,
        { threadId, userId: args.userId },
        { runAfter: 5000 } // Start tracking after 5 seconds
      ),
    ]);

    // Step 4: Adaptive learning adjustments
    const adaptations = await step.runAction(
      internal.agent.adaptLearning,
      {
        threadId,
        progressData: progressTracking,
        contentResults: contentDelivery,
      },
      {
        retry: { maxAttempts: 2, initialBackoffMs: 500, base: 1.5 },
      }
    );

    // Step 5: Final assessment and certification
    return await step.runAction(
      internal.agent.finalizeSession,
      { threadId, adaptations },
      { runAfter: 60000 } // Wait 1 minute before final assessment
    );
  },
});
```

### Agent-Powered Learning Functions

```typescript
// Enhanced agent functions for learning
export const createLearningThread = agent.createThreadMutation();

export const generateLearningPath = agent.asObjectAction({
  schema: z.object({
    questionSequence: z.array(z.number()),
    difficultyProgression: z.array(z.string()),
    estimatedDuration: z.number(),
    personalizedHints: z.array(z.string()),
  }),
  maxSteps: 3,
});

export const deliverContent = agent.asTextAction({
  maxSteps: 10,
  contextOptions: {
    maxMessages: 50,
    includeUserHistory: true,
    searchThreshold: 0.8,
  },
});

export const adaptLearning = agent.asObjectAction({
  schema: z.object({
    adjustedDifficulty: z.string(),
    suggestedFocus: z.array(z.string()),
    nextSteps: z.array(z.string()),
    confidenceScore: z.number(),
  }),
});
```

## Advanced Features Enabled by AgentFlow

### 1. **Persistent Learning Memory**

```typescript
// Agent automatically maintains conversation context
const learningContext = await agent.fetchContextMessages(ctx, {
  threadId,
  contextOptions: {
    maxMessages: 100,
    includeUserHistory: true,
    searchQuery: "convex queries mutations actions",
    searchThreshold: 0.7,
  },
});
```

### 2. **Multi-Modal Learning Workflows**

```typescript
export const comprehensiveLearningWorkflow = workflow.define({
  args: { userId: v.string(), courseModules: v.array(v.string()) },
  handler: async (step, args): Promise<void> => {
    // Process multiple learning modules in parallel
    const moduleResults = await Promise.all(
      args.courseModules.map((module) =>
        step.runAction(internal.agent.processModule, {
          userId: args.userId,
          module,
          format: module.includes("hands-on") ? "interactive" : "conceptual",
        })
      )
    );

    // Synthesize learning across modules
    await step.runAction(internal.agent.synthesizeLearning, {
      userId: args.userId,
      moduleResults,
    });
  },
});
```

### 3. **Intelligent Progress Monitoring**

```typescript
// Real-time progress tracking with workflow status
export const monitorLearningProgress = query({
  args: { workflowId: v.string() },
  handler: async (ctx, args) => {
    const status = await workflow.status(ctx, args.workflowId);
    const threadMessages = await agent.fetchMessages(ctx, {
      threadId: status.context?.threadId,
    });

    return {
      workflowStatus: status,
      conversationProgress: threadMessages,
      estimatedCompletion: calculateCompletion(status, threadMessages),
    };
  },
});
```

### 4. **Failure Recovery and Resilience**

```typescript
// Workflow handles failures gracefully
export const resilientLearningSession = workflow.define({
  args: { sessionId: v.string() },
  handler: async (step, args): Promise<string> => {
    try {
      // Attempt primary learning flow
      return await step.runAction(
        internal.agent.primaryLearningFlow,
        { sessionId: args.sessionId },
        { retry: { maxAttempts: 3, initialBackoffMs: 1000, base: 2 } }
      );
    } catch (error) {
      // Fallback to simplified learning mode
      return await step.runAction(
        internal.agent.fallbackLearningMode,
        { sessionId: args.sessionId, error: error.message },
        { retry: false }
      );
    }
  },
  onComplete: internal.agent.handleSessionComplete,
});
```

## Migrating Current LLM Implementation to AgentFlow

### Current Implementation Analysis

The ConvexCourse app currently uses direct OpenAI API calls in `convex/course.ts` with:

1. **Manual prompt engineering** with static system prompts
2. **Direct fetch calls** to OpenAI API
3. **Basic session management** without persistence
4. **Manual scoring logic** embedded in the action
5. **No retry mechanisms** or error recovery
6. **Limited context management** through message arrays

### Step-by-Step Migration Guide

#### Phase 1: Replace Direct OpenAI Calls with Agent

Replace the current `generateResponse` action with an Agent-powered version:

```typescript
// convex/course-agent.ts - New Agent-powered course logic
import { convexLearningAgent } from "./agentflow";
import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Replace the existing generateResponse with Agent-powered version
export const generateResponseWithAgent = action({
  args: {
    sessionId: v.string(),
    userMessage: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const session = await ctx.runQuery(api.course.getSession, {
      sessionId: args.sessionId,
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Get current question context
    const currentQuestion = await ctx.runQuery(api.course.getCurrentQuestion, {
      sessionId: args.sessionId,
    });

    // Create or continue thread with Agent (no auth required)
    const { threadId } = session.agentThreadId
      ? await convexLearningAgent.continueThread(ctx, {
          threadId: session.agentThreadId,
        })
      : await convexLearningAgent.createThread(ctx, {
          userId: session.sessionId, // Using sessionId as anonymous identifier
          metadata: {
            courseType: session.courseType,
            currentQuestion: session.currentQuestion,
            isAnonymous: true, // Flag to indicate no auth required
          },
        });

    // Update session with threadId if new
    if (!session.agentThreadId) {
      await ctx.runMutation(api.course.updateSession, {
        sessionId: args.sessionId,
        agentThreadId: threadId,
      });
    }

    // Generate response using Agent with enhanced context
    const enhancedPrompt = buildEnhancedPrompt(args.userMessage, currentQuestion, session);

    const result = await convexLearningAgent.generateText(ctx, {
      threadId,
      prompt: enhancedPrompt,
      maxSteps: 3,
    });

    return result.text;
  },
});

// Helper function to build context-aware prompts
function buildEnhancedPrompt(
  userMessage: string,
  currentQuestion: Question | null,
  session: any
): string {
  const questionContext = currentQuestion
    ? `
CURRENT LEARNING OBJECTIVE:
Question: ${currentQuestion.question}
Expected Answer: ${currentQuestion.answer}
Key Topics: ${currentQuestion.topics.join(", ")}
Explanation: ${currentQuestion.explanation}

USER'S RESPONSE: ${userMessage}

Please:
1. Assess if the user's response shows understanding of key concepts
2. Provide encouraging feedback
3. Use the explanation to clarify any misconceptions
4. Award appropriate points (0-10) based on understanding
5. Ask the next question if understanding is demonstrated
`
    : `
COURSE COMPLETION:
The user has completed all questions in the ${session.courseType} course.
Provide a encouraging summary of their learning journey.
`;

  return `${questionContext}

TEACHING GUIDELINES:
- Be encouraging and supportive
- Use code examples when explaining concepts
- Ask follow-up questions to test understanding
- Award points fairly based on comprehension
- Use markdown formatting for code blocks
- Keep responses concise but informative`;
}
```

#### Phase 2: Enhanced Schema for Agent Integration

Update your schema to support Agent threads:

```typescript
// convex/schema.ts - Add Agent support
export default defineSchema({
  ...authTables,
  sessions: defineTable({
    sessionId: v.string(),
    currentQuestion: v.number(),
    totalQuestions: v.optional(v.number()),
    score: v.number(),
    courseType: v.optional(v.string()),
    lastActionWasSkip: v.optional(v.boolean()),
    randomizedQuestionOrder: v.optional(v.array(v.number())),

    // Agent integration fields
    agentThreadId: v.optional(v.string()),
    workflowId: v.optional(v.string()),

    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    isCompleted: v.boolean(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_agent_thread", ["agentThreadId"])
    .index("by_workflow", ["workflowId"]),

  // New table for tracking Agent token usage
  tokenUsage: defineTable({
    userId: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    sessionId: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),
});
```

#### Phase 3: Workflow-Powered Learning Sessions

Create durable learning workflows that handle complex learning paths:

```typescript
// convex/learning-workflows.ts
import { learningWorkflow } from "./agentflow";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const comprehensiveLearningSession = learningWorkflow.define({
  args: {
    sessionId: v.string(),
    courseType: v.string(),
    userId: v.string(),
  },
  handler: async (
    step,
    args
  ): Promise<{
    finalScore: number;
    questionsCompleted: number;
    insights: string[];
  }> => {
    // Step 1: Initialize learning thread
    const initResult = await step.runMutation(internal.courseAgent.initializeLearningThread, {
      sessionId: args.sessionId,
      courseType: args.courseType,
      userId: args.userId,
    });

    // Step 2: Progressive learning loop with checkpoints
    const learningResults = await step.runAction(
      internal.courseAgent.runProgressiveLearning,
      {
        sessionId: args.sessionId,
        threadId: initResult.threadId,
        courseType: args.courseType,
      },
      {
        retry: { maxAttempts: 2, initialBackoffMs: 1000, base: 2 },
      }
    );

    // Step 3: Generate learning insights and recommendations
    const insights = await step.runAction(
      internal.courseAgent.generateLearningInsights,
      {
        sessionId: args.sessionId,
        learningData: learningResults,
      },
      {
        runAfter: 5000, // Wait 5 seconds for data to settle
      }
    );

    // Step 4: Update final session state
    await step.runMutation(internal.course.finalizeSession, {
      sessionId: args.sessionId,
      finalScore: learningResults.score,
      insights: insights.recommendations,
    });

    return {
      finalScore: learningResults.score,
      questionsCompleted: learningResults.questionsAnswered,
      insights: insights.recommendations,
    };
  },
});

// Action to handle progressive learning with Agent
export const runProgressiveLearning = convexLearningAgent.asObjectAction({
  schema: z.object({
    score: z.number(),
    questionsAnswered: z.number(),
    topicsMastered: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
  }),
  maxSteps: 10,
});
```

### Ensuring Correct LLM Responses

#### 1. **Enhanced Prompt Engineering with Agent Tools**

The Agent component provides better prompt management through tools:

```typescript
// Tool to ensure accurate responses
const accuracyTool = createTool({
  description: "Ensure response accuracy by checking against knowledge base",
  args: z.object({
    topic: z.string(),
    userAnswer: z.string(),
    contextQuestion: z.string(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    isAccurate: boolean;
    corrections: string[];
    supplementaryInfo: string;
  }> => {
    // Cross-reference with structured knowledge base
    const knowledgeBase = getConvexKnowledgeBase();
    const topicInfo = knowledgeBase[args.topic];

    if (!topicInfo) {
      return {
        isAccurate: false,
        corrections: ["Topic not found in knowledge base"],
        supplementaryInfo: "Please stick to core Convex concepts",
      };
    }

    // Validate against expected answers
    const keyTerms = topicInfo.keyTerms;
    const userTerms = args.userAnswer.toLowerCase().split(" ");
    const matchedTerms = keyTerms.filter((term) =>
      userTerms.some((userTerm) => userTerm.includes(term.toLowerCase()))
    );

    return {
      isAccurate: matchedTerms.length >= Math.ceil(keyTerms.length * 0.6),
      corrections: topicInfo.commonMistakes || [],
      supplementaryInfo: topicInfo.explanation,
    };
  },
});
```

#### 2. **Structured Knowledge Base Integration**

Create a comprehensive knowledge base that the Agent can reference:

```typescript
// convex/knowledge-base.ts
export function getConvexKnowledgeBase() {
  return {
    reactivity: {
      keyTerms: ["reactive", "live-updating", "subscriptions", "automatic"],
      explanation:
        "Convex queries are live subscriptions that automatically update when data changes",
      commonMistakes: [
        "Thinking queries need manual refresh",
        "Confusing with traditional REST APIs",
      ],
      codeExamples: ["const data = useQuery(api.myTable.list); // Automatically updates!"],
    },
    queries: {
      keyTerms: ["query", "read", "database", "useQuery"],
      explanation: "Queries read data from the database and provide real-time updates",
      commonMistakes: ["Using queries to write data", "Not understanding caching behavior"],
      codeExamples: [
        `export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});`,
      ],
    },
    mutations: {
      keyTerms: ["mutation", "write", "database", "useMutation"],
      explanation: "Mutations write data to the database in transactions",
      commonMistakes: ["Using mutations to read data", "Not handling errors properly"],
      codeExamples: [
        `export const addMessage = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", { text: args.text });
  },
});`,
      ],
    },
    // ... more topics
  };
}
```

#### 3. **Real-time Accuracy Monitoring**

Implement monitoring to track response accuracy:

```typescript
// convex/accuracy-monitoring.ts
export const trackResponseAccuracy = mutation({
  args: {
    sessionId: v.string(),
    question: v.string(),
    expectedAnswer: v.string(),
    agentResponse: v.string(),
    userFeedback: v.optional(v.union(v.literal("helpful"), v.literal("not_helpful"))),
  },
  handler: async (ctx, args) => {
    // Store accuracy data for analysis
    await ctx.db.insert("responseAccuracy", {
      sessionId: args.sessionId,
      question: args.question,
      expectedAnswer: args.expectedAnswer,
      agentResponse: args.agentResponse,
      timestamp: Date.now(),
      userFeedback: args.userFeedback,
      // Calculate similarity score
      accuracyScore: calculateSimilarity(args.expectedAnswer, args.agentResponse),
    });
  },
});

function calculateSimilarity(expected: string, actual: string): number {
  // Simple keyword overlap calculation
  const expectedWords = expected.toLowerCase().split(" ");
  const actualWords = actual.toLowerCase().split(" ");

  const overlap = expectedWords.filter((word) =>
    actualWords.some((actualWord) => actualWord.includes(word))
  ).length;

  return overlap / expectedWords.length;
}
```

## Migration Benefits for ConvexCourse

### From Current Implementation to AgentFlow

| Current Limitations     | AgentFlow Solutions                           |
| ----------------------- | --------------------------------------------- |
| Manual OpenAI API calls | Automatic conversation management with Agent  |
| Basic session storage   | Persistent threads with vector search memory  |
| Simple scoring logic    | Intelligent assessment with learning tools    |
| Linear Q&A flow         | Complex branching workflows with conditionals |
| No failure recovery     | Built-in retry mechanisms and error handling  |
| Limited scalability     | Horizontal scaling with parallelism controls  |
| No long-term learning   | Persistent user learning profiles and history |

### Implementation Strategy

1. **Phase 1: Agent Integration**

   - Replace direct OpenAI calls with Agent component
   - Implement persistent conversation threads
   - Add vector search for learning context

2. **Phase 2: Workflow Enhancement**

   - Create durable learning workflows
   - Add parallel processing for course modules
   - Implement intelligent retry mechanisms

3. **Phase 3: Advanced Features**
   - Multi-agent support for different learning modes
   - Long-running learning assessments
   - Personalized learning path generation

## Usage Patterns

### Starting a Learning Session

```typescript
export const startLearningSession = mutation({
  args: {
    userId: v.string(),
    courseType: v.string(),
    preferences: v.optional(
      v.object({
        difficulty: v.string(),
        pace: v.string(),
        focusAreas: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const sessionId = generateSessionId();

    // Start durable learning workflow
    const workflowId = await workflow.start(
      ctx,
      internal.learning.comprehensiveLearningWorkflow,
      {
        userId: args.userId,
        courseType: args.courseType,
        sessionId,
        preferences: args.preferences,
      },
      {
        onComplete: internal.learning.handleLearningComplete,
        context: { userId: args.userId, sessionId },
      }
    );

    return { sessionId, workflowId };
  },
});
```

### Real-time Progress Monitoring

```typescript
// React component using real-time updates
function LearningProgress({ workflowId }: { workflowId: string }) {
  const progress = useQuery(api.learning.monitorLearningProgress, { workflowId });
  const messages = useQuery(api.agent.messages.list, {
    threadId: progress?.threadId
  });

  return (
    <div>
      <WorkflowStatus status={progress?.workflowStatus} />
      <ConversationView messages={messages} />
      <ProgressBar completion={progress?.estimatedCompletion} />
    </div>
  );
}
```

## Frontend Integration with AgentFlow

### Updated App.tsx for Agent and Workflow Support

Replace the current frontend implementation to support AgentFlow:

```typescript
// src/App.tsx - Enhanced with AgentFlow support
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { MessageRenderer } from "./components/MessageRenderer";

export default function App() {
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showInitialQuestions, setShowInitialQuestions] = useState(true);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [agentThreadId, setAgentThreadId] = useState<string | null>(null);

  // Enhanced queries for AgentFlow
  const session = useQuery(api.course.getSession, { sessionId });
  const workflowStatus = useQuery(
    api.learningWorkflows.getWorkflowStatus,
    workflowId ? { workflowId } : "skip"
  );
  const agentMessages = useQuery(
    api.agent.messages.list,
    agentThreadId ? { threadId: agentThreadId } : "skip"
  );

  // Enhanced mutations and actions
  const createSession = useMutation(api.course.createSession);
  const startLearningWorkflow = useAction(api.learningWorkflows.startLearningSession);
  const sendMessageToAgent = useAction(api.courseAgent.generateResponseWithAgent);

  const handleCourseSelection = async (courseType: string) => {
    setShowInitialQuestions(false);
    setIsLoading(true);

    try {
      // Create session
      await createSession({ sessionId, courseType });

      // Start AgentFlow workflow for enhanced learning experience (no auth required)
      const workflowResult = await startLearningWorkflow({
        sessionId,
        courseType,
        userId: sessionId, // Using sessionId as anonymous identifier
        preferences: {
          difficulty: "adaptive",
          pace: "moderate",
          focusAreas: courseType === "how-convex-works"
            ? ["reactivity", "queries", "mutations"]
            : ["setup", "schema", "functions"]
        }
      });

      setWorkflowId(workflowResult.workflowId);
      setAgentThreadId(workflowResult.threadId);

    } catch (error) {
      console.error("Error starting course:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading || !agentThreadId) return;

    setIsLoading(true);
    try {
      await sendMessageToAgent({
        sessionId,
        userMessage: currentMessage,
        threadId: agentThreadId,
      });
      setCurrentMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reactive progress updates
  useEffect(() => {
    if (workflowStatus?.type === "completed") {
      // Handle workflow completion
      console.log("Learning workflow completed:", workflowStatus.result);
    }
  }, [workflowStatus]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {showInitialQuestions ? (
        <CourseSelectionUI onCourseSelect={handleCourseSelection} />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Enhanced progress indicator */}
          <ProgressHeader
            session={session}
            workflowStatus={workflowStatus}
            agentThreadId={agentThreadId}
          />

          {/* Message display with Agent messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {agentMessages?.map((message, index) => (
              <MessageRenderer
                key={index}
                message={message}
                isUser={message.role === "user"}
              />
            ))}
          </div>

          {/* Enhanced input with workflow awareness */}
          <MessageInput
            value={currentMessage}
            onChange={setCurrentMessage}
            onSend={handleSendMessage}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading || workflowStatus?.type === "completed"}
            placeholder={
              workflowStatus?.type === "completed"
                ? "Course completed! Great job!"
                : "Type your answer or 'skip' to move on..."
            }
          />
        </div>
      )}
    </div>
  );
}

// Enhanced progress header component
function ProgressHeader({
  session,
  workflowStatus,
  agentThreadId
}: {
  session: any;
  workflowStatus: any;
  agentThreadId: string | null;
}) {
  const threadStats = useQuery(
    api.agent.threads.getThreadStats,
    agentThreadId ? { threadId: agentThreadId } : "skip"
  );

  return (
    <div className="bg-gray-50 p-4 border-b">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">
            {session?.courseType === "how-convex-works"
              ? "How Convex Works"
              : "Build Apps with Convex"}
          </h2>
          <p className="text-sm text-gray-600">
            Question {session?.currentQuestion + 1} of {session?.totalQuestions}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Workflow status indicator */}
          <WorkflowStatusBadge status={workflowStatus?.type} />

          {/* Score display */}
          <div className="text-right">
            <p className="text-sm font-medium">Score: {session?.score || 0}</p>
            {threadStats && (
              <p className="text-xs text-gray-500">
                Messages: {threadStats.messageCount}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((session?.currentQuestion || 0) / (session?.totalQuestions || 1)) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Workflow status badge component
function WorkflowStatusBadge({ status }: { status?: string }) {
  const statusConfig = {
    inProgress: { color: "bg-blue-100 text-blue-800", text: "Learning..." },
    completed: { color: "bg-green-100 text-green-800", text: "Complete" },
    failed: { color: "bg-red-100 text-red-800", text: "Error" },
    canceled: { color: "bg-gray-100 text-gray-800", text: "Canceled" },
  };

  const config = statusConfig[status as keyof typeof statusConfig] ||
    { color: "bg-gray-100 text-gray-800", text: "Unknown" };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  );
}

// Enhanced message input component
function MessageInput({
  value,
  onChange,
  onSend,
  onKeyPress,
  disabled,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  placeholder: string;
}) {
  return (
    <div className="border-t p-4">
      <div className="flex space-x-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 border rounded-lg p-2 resize-none h-12 disabled:bg-gray-100"
          rows={1}
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line, or type "skip" to move forward
      </div>
    </div>
  );
}
```

### Enhanced Backend Queries for Frontend

Add new queries to support the enhanced frontend:

```typescript
// convex/learning-workflows.ts - Additional queries for frontend
export const getWorkflowStatus = query({
  args: { workflowId: v.string() },
  returns: v.union(
    v.object({
      type: v.literal("inProgress"),
      currentStep: v.string(),
      progress: v.number(),
    }),
    v.object({
      type: v.literal("completed"),
      result: v.any(),
      completedAt: v.number(),
    }),
    v.object({
      type: v.literal("failed"),
      error: v.string(),
      failedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const status = await learningWorkflow.status(ctx, args.workflowId);

    if (!status) return null;

    if (status.type === "inProgress") {
      return {
        type: "inProgress" as const,
        currentStep: status.currentStep?.name || "unknown",
        progress: status.completedSteps / status.totalSteps,
      };
    }

    if (status.type === "completed") {
      return {
        type: "completed" as const,
        result: status.result,
        completedAt: status.completedAt,
      };
    }

    if (status.type === "failed") {
      return {
        type: "failed" as const,
        error: status.error,
        failedAt: status.failedAt,
      };
    }

    return null;
  },
});

export const startLearningSession = action({
  args: {
    sessionId: v.string(),
    courseType: v.string(),
    userId: v.string(),
    preferences: v.optional(
      v.object({
        difficulty: v.string(),
        pace: v.string(),
        focusAreas: v.array(v.string()),
      })
    ),
  },
  returns: v.object({
    workflowId: v.string(),
    threadId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Create agent thread first
    const { threadId } = await convexLearningAgent.createThread(ctx, {
      userId: args.userId,
      metadata: {
        sessionId: args.sessionId,
        courseType: args.courseType,
        preferences: args.preferences,
      },
    });

    // Start workflow
    const workflowId = await learningWorkflow.start(
      ctx,
      internal.learningWorkflows.comprehensiveLearningSession,
      {
        sessionId: args.sessionId,
        courseType: args.courseType,
        userId: args.userId,
      },
      {
        onComplete: internal.learningWorkflows.handleLearningComplete,
        context: { sessionId: args.sessionId, threadId },
      }
    );

    // Update session with agent and workflow IDs
    await ctx.runMutation(api.course.updateSession, {
      sessionId: args.sessionId,
      agentThreadId: threadId,
      workflowId,
    });

    return { workflowId, threadId };
  },
});
```

## Authentication Requirements

### **TL;DR: No Authentication Required**

The AgentFlow implementation works perfectly **without user authentication**. Here's how:

#### **What Works Without Auth:**

✅ **Agent Conversations** - Use sessionId as anonymous identifier  
✅ **Workflow Execution** - Track by session, not user account  
✅ **Progress Persistence** - Session-based storage in database  
✅ **Token Usage Tracking** - Anonymous analytics by session  
✅ **All Current Features** - Maintains existing user experience

#### **Simple Session-Based Approach:**

```typescript
// Generate anonymous session ID (current approach)
const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Use sessionId everywhere instead of userId
const threadId = await agent.createThread(ctx, {
  userId: sessionId, // Agent needs an identifier, sessionId works fine
  metadata: { isAnonymous: true, courseType: "how-convex-works" },
});

const workflowId = await workflow.start(ctx, learningWorkflow, {
  sessionId,
  userId: sessionId, // Same pattern for workflows
  isAnonymous: true,
});
```

#### **When You Might Want Auth Later:**

- **Cross-device continuity** - Resume sessions on different devices
- **Long-term progress tracking** - Multi-session learning analytics
- **Personalized recommendations** - Based on historical learning patterns
- **Social features** - Sharing progress, leaderboards, etc.

#### **Easy Migration Path:**

The session-based approach makes adding auth later trivial - just replace `sessionId` with actual `userId` when ready, and existing sessions can be migrated or left as anonymous historical data.

## Best Practices

### 1. **Component Coordination**

- Use workflows for orchestration, agents for intelligence
- Leverage agent tools for domain-specific operations
- Implement proper error boundaries between components

### 2. **Performance Optimization**

- Configure appropriate parallelism limits
- Use vector search strategically for context retrieval
- Implement intelligent batching for bulk operations

### 3. **Monitoring and Observability**

- Track token usage across both components
- Monitor workflow execution times and failure rates
- Implement comprehensive logging for debugging

### 4. **User Experience**

- Provide real-time feedback on long-running operations
- Enable cancellation of workflows when appropriate
- Implement graceful degradation for component failures

## Implementation Roadmap

### Phase 1: Foundation Setup (Week 1-2)

1. **Install Components**: Add Agent and Workflow components to your Convex project
2. **Schema Updates**: Extend existing schema to support agent threads and workflow tracking
3. **Basic Integration**: Create initial AgentFlow architecture in `convex/agentflow.ts`

### Phase 2: Agent Migration (Week 3-4)

1. **Replace OpenAI Calls**: Migrate from direct API calls to Agent-powered responses
2. **Enhanced Prompting**: Implement structured knowledge base and accuracy tools
3. **Testing**: Parallel testing of old vs. new implementation

### Phase 3: Workflow Enhancement (Week 5-6)

1. **Durable Sessions**: Implement workflow-powered learning sessions
2. **Progress Tracking**: Add real-time workflow status monitoring
3. **Error Recovery**: Implement automatic retry and fallback mechanisms

### Phase 4: Frontend Integration (Week 7-8)

1. **UI Updates**: Enhance frontend to support AgentFlow features
2. **Real-time Updates**: Implement reactive progress monitoring
3. **User Experience**: Add workflow status indicators and enhanced feedback

### Configuration Requirements

Add these environment variables to your Convex deployment:

```bash
# Required for Agent component
CONVEX_OPENAI_API_KEY=your_openai_api_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Optional: for enhanced monitoring
CONVEX_AGENT_DEBUG=true
CONVEX_WORKFLOW_MAX_PARALLELISM=5
```

### Monitoring and Analytics

Track the effectiveness of your AgentFlow implementation:

```typescript
// convex/agentflow-analytics.ts
export const getAgentFlowMetrics = query({
  args: {},
  returns: v.object({
    totalSessions: v.number(),
    avgCompletionTime: v.number(),
    successRate: v.number(),
    avgTokenUsage: v.number(),
    userSatisfaction: v.number(),
  }),
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();
    const tokenUsage = await ctx.db.query("tokenUsage").collect();

    return {
      totalSessions: sessions.length,
      avgCompletionTime: calculateAvgCompletionTime(sessions),
      successRate: calculateSuccessRate(sessions),
      avgTokenUsage: calculateAvgTokenUsage(tokenUsage),
      userSatisfaction: calculateSatisfactionScore(sessions),
    };
  },
});
```

## Conclusion

The combination of Convex Agent and Workflow components creates a powerful foundation for building sophisticated AI applications. For ConvexCourse, this AgentFlow architecture would enable:

### **Immediate Benefits**

- **Automatic conversation persistence** - Never lose learning context
- **Built-in retry mechanisms** - Resilient to temporary failures
- **Intelligent response accuracy** - Structured knowledge base integration
- **Real-time progress tracking** - Enhanced user experience

### **Long-term Advantages**

- **Scalable architecture** - Handle thousands of concurrent learners
- **Advanced AI capabilities** - Multi-agent support, complex workflows
- **Rich analytics** - Detailed insights into learning patterns
- **Future-proof foundation** - Easy integration of new AI features

### **Migration Strategy Summary**

1. **Start Small**: Begin with Agent component integration
2. **Parallel Testing**: Run both systems simultaneously during transition
3. **Gradual Rollout**: Phase in Workflow features progressively
4. **Monitor Closely**: Track performance and user feedback throughout

The AgentFlow pattern represents a significant evolution from traditional AI chat implementations, providing the reliability, scalability, and intelligence needed for production AI applications. By combining the structured learning approach of ConvexCourse with the robust capabilities of Agent and Workflow components, you create a learning platform that can adapt, scale, and provide consistent educational value.

### **Key Takeaways for Implementation**

- **Use Agent for intelligence**: Leverage tools and context management for accurate responses
- **Use Workflow for orchestration**: Handle complex multi-step learning processes
- **Integrate gradually**: Maintain compatibility while adding new capabilities
- **Monitor continuously**: Track accuracy, performance, and user satisfaction
- **Think long-term**: Design for scalability and future AI feature integration

---

_This documentation serves as a comprehensive guide for implementing AgentFlow patterns in the ConvexCourse application and similar AI-powered learning platforms. The combination of Convex's reactive database, Agent's intelligent conversation management, and Workflow's durable execution creates a powerful foundation for next-generation educational applications._
