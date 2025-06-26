import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Existing course tables - fixed messages field to be required with default empty array
  sessions: defineTable({
    sessionId: v.string(),
    courseType: v.optional(v.string()), // Made optional for existing data
    difficulty: v.optional(v.string()), // "beginning", "intermediate", "advanced"
    currentQuestion: v.number(),
    totalQuestions: v.optional(v.number()), // Made optional for existing data
    score: v.number(),
    isCompleted: v.boolean(),
    isArchived: v.optional(v.boolean()), // Add archive support
    createdAt: v.optional(v.number()), // Made optional for existing data
    lastActionWasSkip: v.optional(v.boolean()),
    agentThreadId: v.optional(v.string()),

    // Messages field - required but can be empty array
    messages: v.array(
      v.object({
        role: v.string(),
        content: v.string(),
        timestamp: v.number(),
        messageId: v.optional(v.string()), // Add messageId for editing
        isVoiceMessage: v.optional(v.boolean()),
        voiceCommand: v.optional(v.string()),
        isAdminIntervention: v.optional(v.boolean()),
        adminNote: v.optional(v.string()),
      })
    ),

    // Legacy fields for backward compatibility
    randomizedQuestionOrder: v.optional(v.array(v.number())),
    completedAt: v.optional(v.number()),
    timeSpent: v.optional(v.number()),
    hintsUsed: v.optional(v.number()),
    correctAnswers: v.optional(v.number()),
    skippedQuestions: v.optional(v.number()),
  }).index("by_sessionId", ["sessionId"]),

  // Separate messages table for new architecture
  messages: defineTable({
    sessionId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.optional(v.number()),
    isVoiceMessage: v.optional(v.boolean()),
    voiceCommand: v.optional(v.string()),
    isAdminIntervention: v.optional(v.boolean()),
    adminNote: v.optional(v.string()),
  }).index("by_sessionId", ["sessionId"]),

  courses: defineTable({
    title: v.string(),
    description: v.string(),
    questions: v.array(
      v.object({
        id: v.string(),
        question: v.string(),
        answer: v.string(),
        explanation: v.string(),
        difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
        tags: v.array(v.string()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  courseStats: defineTable({
    sessionId: v.string(),
    courseType: v.string(),
    questionsAnswered: v.number(),
    correctAnswers: v.number(),
    completionTime: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_sessionId", ["sessionId"]),

  globalStats: defineTable({
    totalSessions: v.number(),
    totalCompletions: v.number(),
    averageScore: v.number(),
    lastUpdated: v.number(),
  }),

  // Token usage tracking
  tokenUsage: defineTable({
    sessionId: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    model: v.string(),
    timestamp: v.number(),
    cost: v.optional(v.number()),
  }).index("by_sessionId", ["sessionId"]),

  // Questions table for course content
  questions: defineTable({
    courseType: v.string(),
    questionNumber: v.number(),
    question: v.string(),
    expectedAnswer: v.optional(v.string()),
    hints: v.optional(v.array(v.string())),
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
    tags: v.optional(v.array(v.string())),
  }).index("by_courseType", ["courseType"]),

  // New table for tracking Agent token usage
  agentUsage: defineTable({
    sessionId: v.string(),
    agentThreadId: v.optional(v.string()),
    workflowId: v.optional(v.string()),
    tokenUsage: v.object({
      inputTokens: v.number(),
      outputTokens: v.number(),
      totalTokens: v.number(),
    }),
    timestamp: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_agentThreadId", ["agentThreadId"])
    .index("by_workflowId", ["workflowId"]),

  // New table for dynamic course settings
  courseSettings: defineTable({
    courseType: v.string(), // "how-convex-works", "build-apps", "build-apps-cards"
    difficulty: v.string(), // "beginning", "intermediate", "advanced"
    totalQuestions: v.number(),
    maxScore: v.number(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()), // admin who updated it
  }).index("by_courseType_difficulty", ["courseType", "difficulty"]),

  // New table for Convex documentation references
  convexDocs: defineTable({
    docType: v.string(), // "main", "llms", "api", etc.
    url: v.string(),
    content: v.optional(v.string()), // Cached content excerpt
    lastFetched: v.number(),
    isActive: v.boolean(),
    updatedBy: v.optional(v.string()),
  })
    .index("by_docType", ["docType"])
    .index("by_isActive", ["isActive"]),

  // Playground sessions for AgentFlow playground
  playgroundSessions: defineTable({
    sessionId: v.string(),
    threadId: v.string(),
    createdAt: v.number(),
    lastActivity: v.number(),
  }).index("by_session", ["sessionId"]),

  // Document search tables
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.string(),
  }),

  documentChunks: defineTable({
    documentId: v.id("documents"),
    chunkIndex: v.number(),
    content: v.string(),
    // In production, would include:
    // embedding: v.array(v.number()),
  }).index("by_documentId", ["documentId"]),
});
