import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// =============================================================================
// ADMIN SESSION MONITORING
// =============================================================================

/**
 * Get all sessions for admin monitoring (with archive filter)
 */
export const getAllActiveSessions = query({
  args: {
    showArchived: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("sessions"),
      sessionId: v.string(),
      courseType: v.optional(v.string()),
      currentQuestion: v.number(),
      totalQuestions: v.optional(v.number()),
      score: v.number(),
      isCompleted: v.boolean(),
      isArchived: v.optional(v.boolean()),
      lastActivity: v.number(),
      messageCount: v.number(),
      hasAdminIntervention: v.boolean(),
      isTakenOver: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const sessions = await ctx.db.query("sessions").order("desc").take(100);

    // Filter based on archive status
    const filteredSessions = sessions.filter((session) => {
      const isArchived = session.isArchived || false;
      return args.showArchived ? isArchived : !isArchived;
    });

    return filteredSessions.map((session) => {
      const lastActivity =
        session.messages.length > 0
          ? Math.max(...session.messages.map((m) => m.timestamp))
          : session._creationTime;

      const hasAdminIntervention = session.messages.some((m) => (m as any).isAdminIntervention);

      // Check if session is taken over (look for recent takeover message)
      const recentTakeoverMsg = session.messages
        .filter((m) => (m as any).isAdminIntervention && m.content.includes("🔴 ADMIN TAKEOVER"))
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      const recentRestoreMsg = session.messages
        .filter((m) => (m as any).isAdminIntervention && m.content.includes("🟢 AI RESTORED"))
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      const isTakenOver =
        recentTakeoverMsg &&
        (!recentRestoreMsg || recentTakeoverMsg.timestamp > recentRestoreMsg.timestamp);

      return {
        _id: session._id,
        sessionId: session.sessionId,
        courseType: session.courseType,
        currentQuestion: session.currentQuestion,
        totalQuestions: session.totalQuestions,
        score: session.score,
        isCompleted: session.isCompleted,
        isArchived: session.isArchived || false,
        lastActivity,
        messageCount: session.messages.length,
        hasAdminIntervention,
        isTakenOver: !!isTakenOver,
      };
    });
  },
});

// Helper function to safely get messages array
const getMessagesArray = (
  session: any
): Array<{
  role: string;
  content: string;
  timestamp: number;
  isAdminIntervention?: boolean;
  adminNote?: string;
  isVoiceMessage?: boolean;
  voiceCommand?: string;
}> => {
  return session.messages || [];
};

/**
 * Get detailed session information for admin intervention
 */
export const getSessionDetails = query({
  args: { sessionId: v.string() },
  returns: v.union(
    v.object({
      sessionId: v.string(),
      courseType: v.optional(v.string()),
      currentQuestion: v.number(),
      totalQuestions: v.optional(v.number()),
      score: v.number(),
      isCompleted: v.boolean(),
      createdAt: v.number(),
      lastActivity: v.number(),
      messageCount: v.number(),
      hasAdminIntervention: v.boolean(),
      canTakeOver: v.boolean(),
      canRestore: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return null;
    }

    const messages = getMessagesArray(session);
    const lastActivity =
      messages.length > 0
        ? Math.max(...messages.map((m: any) => m.timestamp))
        : session._creationTime;

    const hasAdminIntervention = messages.some((m: any) => m.isAdminIntervention);

    // Check for recent takeover message (within last 5 minutes)
    const recentTakeoverMsg = messages
      .filter((m: any) => m.isAdminIntervention && m.content.includes("🎯 Admin"))
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

    const recentRestoreMsg = messages
      .filter((m: any) => m.isAdminIntervention && m.content.includes("🔄 Session restored"))
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

    const canTakeOver =
      !recentTakeoverMsg ||
      (recentRestoreMsg && recentRestoreMsg.timestamp > recentTakeoverMsg.timestamp);

    const canRestore =
      recentTakeoverMsg &&
      (!recentRestoreMsg || recentTakeoverMsg.timestamp > recentRestoreMsg.timestamp);

    return {
      sessionId: session.sessionId,
      courseType: session.courseType || "unknown",
      currentQuestion: session.currentQuestion,
      totalQuestions: session.totalQuestions || 0,
      score: session.score,
      isCompleted: session.isCompleted,
      createdAt: session._creationTime,
      lastActivity,
      messageCount: messages.length,
      hasAdminIntervention,
      canTakeOver,
      canRestore,
    };
  },
});

/**
 * Insert context-aware admin message for current card/question
 */
export const insertContextualAdminMessage = mutation({
  args: {
    sessionId: v.string(),
    content: v.string(),
    adminNote: v.optional(v.string()),
    targetContext: v.optional(v.string()), // "current", "card_3", "question_5", etc.
  },
  returns: v.object({
    messageId: v.string(),
    context: v.string(),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    // Determine the context for the message
    let messageContext = "";
    let contextualContent = args.content;

    if (session.courseType === "build-apps-cards") {
      const targetCard =
        args.targetContext === "current" || !args.targetContext
          ? session.currentQuestion + 1
          : parseInt(args.targetContext.replace("card_", "")) || session.currentQuestion + 1;

      messageContext = `Card ${targetCard}`;

      // Prepend card context if not already present
      if (!contextualContent.toLowerCase().includes(`card ${targetCard}`)) {
        contextualContent = `💡 Card ${targetCard} hint: ${contextualContent}`;
      }
    } else {
      const targetQuestion =
        args.targetContext === "current" || !args.targetContext
          ? session.currentQuestion + 1
          : parseInt(args.targetContext.replace("question_", "")) || session.currentQuestion + 1;

      messageContext = `Question ${targetQuestion}`;

      // Prepend question context if not already present
      if (!contextualContent.toLowerCase().includes(`question ${targetQuestion}`)) {
        contextualContent = `💡 Question ${targetQuestion} guidance: ${contextualContent}`;
      }
    }

    const timestamp = Date.now();
    const messageId = `${args.sessionId}_msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    const adminMessage = {
      role: "assistant",
      content: contextualContent,
      timestamp,
      messageId,
      isAdminIntervention: true,
      adminNote: args.adminNote || `Admin hint for ${messageContext}`,
    };

    await ctx.db.patch(session._id, {
      messages: [...session.messages, adminMessage],
    });

    return {
      messageId,
      context: messageContext,
    };
  },
});

/**
 * Delete admin message by ID
 */
export const deleteAdminMessage = mutation({
  args: {
    sessionId: v.string(),
    messageId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    deletedContent: v.string(),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    // Find message by ID and ensure it's an admin message
    const messageIndex = session.messages.findIndex((msg, index) => {
      // Check both stored messageId and generated fallback ID
      const storedId = (msg as any).messageId;
      const fallbackId = `${session.sessionId}_msg_${index}_${msg.timestamp}`;
      const isIdMatch = storedId === args.messageId || fallbackId === args.messageId;
      return isIdMatch && (msg as any).isAdminIntervention;
    });

    if (messageIndex === -1) {
      // Debug info for troubleshooting
      const adminMessages = session.messages.filter((m) => (m as any).isAdminIntervention);
      console.log(`Delete attempt for messageId: ${args.messageId}`);
      console.log(`Found ${adminMessages.length} admin messages in session`);
      console.log(
        `Available messageIds:`,
        adminMessages.map((m, i) => ({
          stored: (m as any).messageId,
          fallback: `${session.sessionId}_msg_${i}_${m.timestamp}`,
        }))
      );
      throw new Error("Admin message not found or not deletable");
    }

    const deletedMessage = session.messages[messageIndex];
    const updatedMessages = session.messages.filter((_, index) => index !== messageIndex);

    await ctx.db.patch(session._id, {
      messages: updatedMessages,
    });

    return {
      success: true,
      deletedContent: deletedMessage.content.substring(0, 50) + "...",
    };
  },
});

/**
 * Delete any message by ID (admin or AI response)
 */
export const deleteAnyMessage = mutation({
  args: {
    sessionId: v.string(),
    messageId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    deletedContent: v.string(),
    messageType: v.string(),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    // Find message by ID
    const messageIndex = session.messages.findIndex((msg, index) => {
      // Check both stored messageId and generated fallback ID
      const storedId = (msg as any).messageId;
      const fallbackId = `${session.sessionId}_msg_${index}_${msg.timestamp}`;
      return storedId === args.messageId || fallbackId === args.messageId;
    });

    if (messageIndex === -1) {
      throw new Error("Message not found");
    }

    const deletedMessage = session.messages[messageIndex];

    // Don't allow deleting user messages
    if (deletedMessage.role === "user") {
      throw new Error("Cannot delete user messages");
    }

    const updatedMessages = session.messages.filter((_, index) => index !== messageIndex);

    await ctx.db.patch(session._id, {
      messages: updatedMessages,
    });

    const messageType = (deletedMessage as any).isAdminIntervention ? "admin" : "ai";

    return {
      success: true,
      deletedContent: deletedMessage.content.substring(0, 50) + "...",
      messageType,
    };
  },
});

/**
 * Edit admin message or AI response
 */
export const editMessage = mutation({
  args: {
    sessionId: v.string(),
    messageId: v.string(),
    newContent: v.string(),
    adminNote: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    originalContent: v.string(),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    // Find message by ID
    const messageIndex = session.messages.findIndex((msg, index) => {
      // Check both stored messageId and generated fallback ID
      const storedId = (msg as any).messageId;
      const fallbackId = `${session.sessionId}_msg_${index}_${msg.timestamp}`;
      return storedId === args.messageId || fallbackId === args.messageId;
    });

    if (messageIndex === -1) {
      throw new Error("Message not found");
    }

    const originalMessage = session.messages[messageIndex];

    // Only allow editing admin messages or assistant responses
    if (originalMessage.role === "user") {
      throw new Error("Cannot edit user messages");
    }

    const updatedMessages = [...session.messages];
    updatedMessages[messageIndex] = {
      ...originalMessage,
      content: args.newContent,
      isAdminIntervention: true,
      adminNote: args.adminNote || `Admin edit: ${new Date().toLocaleTimeString()}`,
    };

    await ctx.db.patch(session._id, {
      messages: updatedMessages,
    });

    return {
      success: true,
      originalContent: originalMessage.content.substring(0, 50) + "...",
    };
  },
});

/**
 * Get admin messages for specific context (card/question)
 */
export const getContextualAdminMessages = query({
  args: {
    sessionId: v.string(),
    context: v.string(), // "card_1", "question_3", etc.
  },
  returns: v.array(
    v.object({
      messageId: v.string(),
      content: v.string(),
      adminNote: v.optional(v.string()),
      timestamp: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) return [];

    // Filter messages for the specific context
    const contextualMessages = session.messages
      .map((msg, index) => ({
        ...msg,
        messageId: (msg as any).messageId || `${session.sessionId}_msg_${index}_${msg.timestamp}`,
      }))
      .filter((msg) => {
        if (!(msg as any).isAdminIntervention) return false;

        const content = msg.content.toLowerCase();
        const contextLower = args.context.toLowerCase();

        // Check if message is for this specific context
        return (
          content.includes(contextLower.replace("_", " ")) ||
          content.includes("hint") ||
          content.includes("guidance")
        );
      })
      .map((msg) => ({
        messageId: msg.messageId,
        content: msg.content,
        adminNote: (msg as any).adminNote,
        timestamp: msg.timestamp,
      }));

    return contextualMessages;
  },
});

// =============================================================================
// LEGACY FUNCTIONS (for backward compatibility)
// =============================================================================

/**
 * Legacy insert admin message (redirects to contextual version)
 */
export const insertAdminMessage = mutation({
  args: {
    sessionId: v.string(),
    content: v.string(),
    adminNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(api.playground.insertContextualAdminMessage, {
      sessionId: args.sessionId,
      content: args.content,
      adminNote: args.adminNote,
      targetContext: "current",
    });
    return null;
  },
});

/**
 * Archive or unarchive a session
 */
export const archiveSession = mutation({
  args: {
    sessionId: v.string(),
    archive: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      isArchived: args.archive,
    });

    return null;
  },
});

/**
 * Delete a session permanently
 */
export const deleteSession = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.delete(session._id);
    return null;
  },
});

/**
 * Bulk archive multiple sessions
 */
export const bulkArchiveSessions = mutation({
  args: {
    sessionIds: v.array(v.string()),
    archive: v.boolean(),
  },
  returns: v.object({
    processed: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, args) => {
    let processed = 0;
    let errors = 0;

    for (const sessionId of args.sessionIds) {
      try {
        const session = await ctx.db
          .query("sessions")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
          .first();

        if (session) {
          await ctx.db.patch(session._id, {
            isArchived: args.archive,
          });
          processed++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`Error processing session ${sessionId}:`, error);
        errors++;
      }
    }

    return { processed, errors };
  },
});

/**
 * Bulk delete multiple sessions
 */
export const bulkDeleteSessions = mutation({
  args: {
    sessionIds: v.array(v.string()),
  },
  returns: v.object({
    deleted: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, args) => {
    let deleted = 0;
    let errors = 0;

    for (const sessionId of args.sessionIds) {
      try {
        const session = await ctx.db
          .query("sessions")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
          .first();

        if (session) {
          await ctx.db.delete(session._id);
          deleted++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`Error deleting session ${sessionId}:`, error);
        errors++;
      }
    }

    return { deleted, errors };
  },
});

/**
 * Clear all messages from multiple sessions
 */
export const bulkClearSessionMessages = mutation({
  args: {
    sessionIds: v.array(v.string()),
  },
  returns: v.object({
    cleared: v.number(),
    errors: v.number(),
  }),
  handler: async (ctx, args) => {
    let cleared = 0;
    let errors = 0;

    for (const sessionId of args.sessionIds) {
      try {
        const session = await ctx.db
          .query("sessions")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
          .first();

        if (session) {
          await ctx.db.patch(session._id, {
            messages: [],
            currentQuestion: 0,
            score: 0,
            isCompleted: false,
          });
          cleared++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error(`Error clearing session ${sessionId}:`, error);
        errors++;
      }
    }

    return { cleared, errors };
  },
});

/**
 * Edit any AI message in a session (replaces replaceLastAIMessage)
 */
export const editAIMessage = mutation({
  args: {
    sessionId: v.string(),
    messageId: v.string(),
    newContent: v.string(),
    adminNote: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    const messages = [...session.messages];

    // Find the message by messageId with fallback ID support
    const messageIndex = messages.findIndex((msg, index) => {
      // Check both stored messageId and generated fallback ID
      const storedId = (msg as any).messageId;
      const fallbackId = `${session.sessionId}_msg_${index}_${msg.timestamp}`;
      return storedId === args.messageId || fallbackId === args.messageId;
    });

    if (messageIndex === -1) {
      throw new Error("Message not found");
    }

    // Update the message
    messages[messageIndex] = {
      ...messages[messageIndex],
      content: args.newContent,
      isAdminIntervention: true,
      adminNote: args.adminNote || "Edited by admin",
    };

    await ctx.db.patch(session._id, { messages });
    return null;
  },
});

/**
 * Take over session - disable AI and enable human-only responses
 */
export const takeOverSession = mutation({
  args: {
    sessionId: v.string(),
    takeover: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    // Add a system message to indicate takeover status
    const timestamp = Date.now();
    const systemMessage = {
      role: "system",
      content: args.takeover
        ? "🔴 ADMIN TAKEOVER: AI responses disabled, human instructor active"
        : "🟢 AI RESTORED: Automatic responses re-enabled",
      timestamp,
      messageId: `${args.sessionId}_msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      isAdminIntervention: true,
      adminNote: args.takeover ? "Session taken over by admin" : "Session returned to AI",
    };

    await ctx.db.patch(session._id, {
      messages: [...session.messages, systemMessage],
    });

    return null;
  },
});

/**
 * Update session progress manually
 */
export const updateSessionProgress = mutation({
  args: {
    sessionId: v.string(),
    scoreAdjustment: v.optional(v.number()),
    questionJump: v.optional(v.number()),
    markCompleted: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    const updates: any = {};

    if (args.scoreAdjustment !== undefined) {
      updates.score = Math.max(0, session.score + args.scoreAdjustment);
    }

    if (args.questionJump !== undefined) {
      updates.currentQuestion = Math.max(0, args.questionJump);
    }

    if (args.markCompleted !== undefined) {
      updates.isCompleted = args.markCompleted;
    }

    await ctx.db.patch(session._id, updates);

    // Add admin note about the changes
    if (Object.keys(updates).length > 0) {
      const timestamp = Date.now();
      const adminMessage = {
        role: "system",
        content: `⚙️ Admin updated session: ${Object.keys(updates).join(", ")}`,
        timestamp,
        messageId: `${args.sessionId}_msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        isAdminIntervention: true,
        adminNote: "Progress adjustment by admin",
      };

      await ctx.db.patch(session._id, {
        messages: [...session.messages, adminMessage],
      });
    }

    return null;
  },
});

// =============================================================================
// REAL-TIME MONITORING
// =============================================================================

/**
 * Get live session statistics for admin dashboard
 */
export const getAdminStats = query({
  args: {},
  returns: v.object({
    totalSessions: v.number(),
    activeSessions: v.number(),
    completedSessions: v.number(),
    archivedSessions: v.number(),
    averageScore: v.number(),
    sessionsWithIntervention: v.number(),
    recentActivity: v.array(
      v.object({
        sessionId: v.string(),
        courseType: v.optional(v.string()),
        lastMessage: v.string(),
        timestamp: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Filter out archived sessions for active/completed counts
    const nonArchivedSessions = sessions.filter((s) => !s.isArchived);
    const archivedSessions = sessions.filter((s) => s.isArchived);

    const activeSessions = nonArchivedSessions.filter((s) => {
      const lastActivity =
        s.messages.length > 0 ? Math.max(...s.messages.map((m) => m.timestamp)) : s._creationTime;
      return lastActivity > oneHourAgo && !s.isCompleted;
    });

    const completedSessions = nonArchivedSessions.filter((s) => s.isCompleted);

    const sessionsWithIntervention = nonArchivedSessions.filter((s) =>
      s.messages.some((m) => (m as any).isAdminIntervention)
    );

    const averageScore =
      nonArchivedSessions.length > 0
        ? nonArchivedSessions.reduce((sum, s) => sum + s.score, 0) / nonArchivedSessions.length
        : 0;

    // Get recent activity (exclude archived)
    const recentActivity = nonArchivedSessions
      .filter((s) => s.messages.length > 0)
      .map((s) => ({
        sessionId: s.sessionId,
        courseType: s.courseType,
        lastMessage: s.messages[s.messages.length - 1].content.slice(0, 100) + "...",
        timestamp: Math.max(...s.messages.map((m) => m.timestamp)),
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      totalSessions: nonArchivedSessions.length,
      activeSessions: activeSessions.length,
      completedSessions: completedSessions.length,
      archivedSessions: archivedSessions.length,
      averageScore: Math.round(averageScore * 10) / 10,
      sessionsWithIntervention: sessionsWithIntervention.length,
      recentActivity,
    };
  },
});

/**
 * Check if session is under admin takeover
 */
export const isSessionTakenOver = query({
  args: { sessionId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    try {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
        .first();

      if (!session) return false;

      // Check for recent takeover message
      const recentTakeoverMsg = session.messages
        .filter((m) => (m as any).isAdminIntervention && m.content.includes("🔴 ADMIN TAKEOVER"))
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      const recentRestoreMsg = session.messages
        .filter((m) => (m as any).isAdminIntervention && m.content.includes("🟢 AI RESTORED"))
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      const isTakenOver = !!(
        recentTakeoverMsg &&
        (!recentRestoreMsg || recentTakeoverMsg.timestamp > recentRestoreMsg.timestamp)
      );

      return isTakenOver;
    } catch (error) {
      console.error("Error checking session takeover status:", error);
      return false; // Always return false on error to prevent blocking
    }
  },
});

/**
 * Get session with full messages for playground
 */
export const getSessionWithMessages = query({
  args: { sessionId: v.string() },
  returns: v.union(
    v.object({
      sessionId: v.string(),
      courseType: v.optional(v.string()),
      currentQuestion: v.number(),
      totalQuestions: v.optional(v.number()),
      score: v.number(),
      isCompleted: v.boolean(),
      createdAt: v.number(),
      lastActivity: v.number(),
      messageCount: v.number(),
      hasAdminIntervention: v.boolean(),
      canTakeOver: v.boolean(),
      canRestore: v.boolean(),
      isTakenOver: v.boolean(),
      currentContext: v.string(),
      messages: v.array(
        v.object({
          role: v.string(),
          content: v.string(),
          timestamp: v.number(),
          isAdminIntervention: v.optional(v.boolean()),
          adminNote: v.optional(v.string()),
          isVoiceMessage: v.optional(v.boolean()),
          voiceCommand: v.optional(v.string()),
          messageId: v.optional(v.string()), // Make optional for backward compatibility
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return null;
    }

    const messages = getMessagesArray(session);
    const lastActivity =
      messages.length > 0
        ? Math.max(...messages.map((m: any) => m.timestamp))
        : session._creationTime;

    const hasAdminIntervention = messages.some((m: any) => m.isAdminIntervention);

    // Check for recent takeover message
    const recentTakeoverMsg = messages
      .filter((m: any) => m.isAdminIntervention && m.content.includes("🔴 ADMIN TAKEOVER"))
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

    const recentRestoreMsg = messages
      .filter((m: any) => m.isAdminIntervention && m.content.includes("🟢 AI RESTORED"))
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

    const isTakenOver =
      recentTakeoverMsg &&
      (!recentRestoreMsg || recentTakeoverMsg.timestamp > recentRestoreMsg.timestamp);

    const canTakeOver = !isTakenOver;
    const canRestore = !!isTakenOver;

    // Determine current context
    const currentContext =
      session.courseType === "build-apps-cards"
        ? `card ${session.currentQuestion + 1}`
        : `question ${session.currentQuestion + 1}`;

    // Add message IDs for messages that don't have them
    const messagesWithIds = messages.map((msg: any, index: number) => ({
      ...msg,
      messageId: msg.messageId || `${session.sessionId}_msg_${index}_${msg.timestamp}`,
    }));

    return {
      sessionId: session.sessionId,
      courseType: session.courseType || "unknown",
      currentQuestion: session.currentQuestion,
      totalQuestions: session.totalQuestions || 0,
      score: session.score,
      isCompleted: session.isCompleted,
      createdAt: session._creationTime,
      lastActivity,
      messageCount: messages.length,
      hasAdminIntervention,
      canTakeOver,
      canRestore,
      isTakenOver: !!isTakenOver,
      currentContext,
      messages: messagesWithIds,
    };
  },
});

export const getAllSessions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sessions"),
      sessionId: v.string(),
      courseType: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      currentQuestion: v.number(),
      totalQuestions: v.optional(v.number()),
      score: v.number(),
      isCompleted: v.boolean(),
      isArchived: v.optional(v.boolean()),
      createdAt: v.optional(v.number()),
      lastActionWasSkip: v.optional(v.boolean()),
      isTakenOver: v.boolean(),
    })
  ),
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").order("desc").collect();

    return sessions.map((session) => {
      // Check for recent takeover message
      const recentTakeoverMsg = session.messages
        .filter((m: any) => m.isAdminIntervention && m.content.includes("🔴 ADMIN TAKEOVER"))
        .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

      const recentRestoreMsg = session.messages
        .filter((m: any) => m.isAdminIntervention && m.content.includes("🟢 AI RESTORED"))
        .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

      const isTakenOver = !!(
        recentTakeoverMsg &&
        (!recentRestoreMsg || recentTakeoverMsg.timestamp > recentRestoreMsg.timestamp)
      );

      return {
        _id: session._id,
        sessionId: session.sessionId,
        courseType: session.courseType,
        difficulty: session.difficulty,
        currentQuestion: session.currentQuestion,
        totalQuestions: session.totalQuestions,
        score: session.score,
        isCompleted: session.isCompleted,
        isArchived: session.isArchived,
        createdAt: session.createdAt,
        lastActionWasSkip: session.lastActionWasSkip,
        isTakenOver,
      };
    });
  },
});

export const getSession = query({
  args: { sessionId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("sessions"),
      sessionId: v.string(),
      courseType: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      currentQuestion: v.number(),
      totalQuestions: v.optional(v.number()),
      score: v.number(),
      isCompleted: v.boolean(),
      isArchived: v.optional(v.boolean()),
      createdAt: v.optional(v.number()),
      lastActionWasSkip: v.optional(v.boolean()),
      isTakenOver: v.boolean(),
      messages: v.array(
        v.object({
          _id: v.id("messages"),
          _creationTime: v.number(),
          sessionId: v.string(),
          role: v.string(),
          content: v.string(),
          isAgentMessage: v.optional(v.boolean()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return null;
    }

    // Check for recent takeover message
    const recentTakeoverMsg = session.messages
      .filter((m: any) => m.isAdminIntervention && m.content.includes("🔴 ADMIN TAKEOVER"))
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

    const recentRestoreMsg = session.messages
      .filter((m: any) => m.isAdminIntervention && m.content.includes("🟢 AI RESTORED"))
      .sort((a: any, b: any) => b.timestamp - a.timestamp)[0];

    const isTakenOver = !!(
      recentTakeoverMsg &&
      (!recentRestoreMsg || recentTakeoverMsg.timestamp > recentRestoreMsg.timestamp)
    );

    // Convert session messages to the expected format for the separate messages table
    const messages = session.messages.map((msg: any, index: number) => ({
      _id: `msg_${session._id}_${index}` as any, // Mock ID for compatibility
      _creationTime: msg.timestamp || session._creationTime,
      sessionId: session.sessionId,
      role: msg.role,
      content: msg.content,
      isAgentMessage: msg.isAdminIntervention ? false : msg.role === "assistant",
    }));

    return {
      _id: session._id,
      sessionId: session.sessionId,
      courseType: session.courseType,
      difficulty: session.difficulty,
      currentQuestion: session.currentQuestion,
      totalQuestions: session.totalQuestions,
      score: session.score,
      isCompleted: session.isCompleted,
      isArchived: session.isArchived,
      createdAt: session.createdAt,
      lastActionWasSkip: session.lastActionWasSkip,
      isTakenOver,
      messages,
    };
  },
});
