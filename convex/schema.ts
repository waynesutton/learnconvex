import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  sessions: defineTable({
    sessionId: v.string(),
    currentQuestion: v.number(),
    totalQuestions: v.optional(v.number()), // New field for configurable total questions (optional for existing data)
    score: v.number(),
    courseType: v.optional(v.string()), // "how-convex-works" or "build-apps"
    lastActionWasSkip: v.optional(v.boolean()), // Track if last action was a skip
    randomizedQuestionOrder: v.optional(v.array(v.number())), // Array of question indices in randomized order
    messages: v.array(
      v.object({
        role: v.string(), // "user" or "assistant"
        content: v.string(),
        timestamp: v.number(),
      })
    ),
    isCompleted: v.boolean(),
  }).index("by_session_id", ["sessionId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
