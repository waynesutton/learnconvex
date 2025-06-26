import { components } from "./_generated/api";
import { api } from "./_generated/api";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// AgentFlow Integration for Enhanced Learning Experience
// This module provides the foundation for Agent-powered course interactions

/**
 * Get AgentFlow status for a session
 */
export const getAgentFlowStatus = query({
  args: { sessionId: v.string() },
  returns: v.object({
    isEnabled: v.boolean(),
    threadId: v.optional(v.string()),
    lastActivity: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      return { isEnabled: false };
    }

    return {
      isEnabled: !!session.agentThreadId,
      threadId: session.agentThreadId,
      lastActivity:
        session.messages?.length > 0
          ? Math.max(...session.messages.map((m: any) => m.timestamp))
          : session._creationTime,
    };
  },
});

/**
 * Initialize AgentFlow for a session
 */
export const initializeAgentFlow = mutation({
  args: {
    sessionId: v.string(),
    threadId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(session._id, {
      agentThreadId: args.threadId,
    });

    return null;
  },
});

/**
 * Track AgentFlow usage and performance
 */
export const trackAgentFlowUsage = mutation({
  args: {
    sessionId: v.string(),
    tokenUsage: v.object({
      inputTokens: v.number(),
      outputTokens: v.number(),
      totalTokens: v.number(),
    }),
    responseTime: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("agentUsage", {
      sessionId: args.sessionId,
      tokenUsage: args.tokenUsage,
      timestamp: Date.now(),
    });

    return null;
  },
});

/**
 * Get AgentFlow analytics for admin dashboard
 */
export const getAgentFlowAnalytics = query({
  args: {},
  returns: v.object({
    totalSessions: v.number(),
    averageTokenUsage: v.number(),
    successRate: v.number(),
    recentActivity: v.array(
      v.object({
        sessionId: v.string(),
        timestamp: v.number(),
        tokenUsage: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const agentUsage = await ctx.db.query("agentUsage").collect();

    if (agentUsage.length === 0) {
      return {
        totalSessions: 0,
        averageTokenUsage: 0,
        successRate: 0,
        recentActivity: [],
      };
    }

    const uniqueSessions = new Set(agentUsage.map((u) => u.sessionId)).size;
    const totalTokens = agentUsage.reduce((sum, u) => sum + u.tokenUsage.totalTokens, 0);
    const averageTokenUsage = totalTokens / agentUsage.length;

    const recentActivity = agentUsage
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map((u) => ({
        sessionId: u.sessionId,
        timestamp: u.timestamp,
        tokenUsage: u.tokenUsage.totalTokens,
      }));

    return {
      totalSessions: uniqueSessions,
      averageTokenUsage: Math.round(averageTokenUsage),
      successRate: 100, // TODO: Calculate based on error tracking
      recentActivity,
    };
  },
});
