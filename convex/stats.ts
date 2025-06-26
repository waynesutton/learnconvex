import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Updated stats validators without howConvexWorks
const courseBreakdownValidator = v.object({
  chatMode: v.number(),
  cardsMode: v.number(),
});

const averageScoreByModeValidator = v.object({
  chatMode: v.number(),
  cardsMode: v.number(),
});

// Get overall stats for the stats page
export const getOverallStats = query({
  args: {},
  returns: v.object({
    totalSessionsCompleted: v.number(),
    totalSessionsStarted: v.number(),
    averageScore: v.number(),
    totalQuestionsAnswered: v.number(),
    courseBreakdown: courseBreakdownValidator,
    averageScoreByMode: averageScoreByModeValidator,
    completionRate: v.number(),
    totalSkippedQuestions: v.number(),
    correctAnswersEstimate: v.number(),
    incorrectAnswersEstimate: v.number(),
  }),
  handler: async (ctx) => {
    const allSessions = await ctx.db.query("sessions").collect();

    // Filter out sessions that were never actually used (no messages and currentQuestion = 0)
    // AND exclude archived sessions from public stats
    const activeSessions = allSessions.filter(
      (session) =>
        (session.currentQuestion > 0 || session.messages.length > 0 || session.courseType) &&
        !session.isArchived // Exclude archived sessions from stats
    );

    const completedSessions = activeSessions.filter((session) => session.isCompleted);
    const totalSessionsStarted = activeSessions.length;
    const totalSessionsCompleted = completedSessions.length;

    // Calculate average score
    const totalScore = completedSessions.reduce((sum, session) => sum + (session.score || 0), 0);
    const averageScore = completedSessions.length > 0 ? totalScore / completedSessions.length : 0;

    // Calculate total questions answered (including skipped)
    const totalQuestionsAnswered = completedSessions.reduce(
      (sum, session) => sum + (session.currentQuestion || 0),
      0
    );

    // Calculate course breakdown - removed howConvexWorks
    const courseBreakdown = {
      chatMode: completedSessions.filter((s) => s.courseType === "build-apps").length,
      cardsMode: completedSessions.filter((s) => s.courseType === "build-apps-cards").length,
    };

    // Average score by mode
    const chatModeSessions = completedSessions.filter((s) => s.courseType === "build-apps");
    const cardsModeSessions = completedSessions.filter((s) => s.courseType === "build-apps-cards");

    // Calculate average scores by mode - removed howConvexWorks
    const averageScoreByMode = {
      chatMode:
        chatModeSessions.length > 0
          ? Math.round(
              chatModeSessions.reduce((sum, s) => sum + (s.score || 0), 0) / chatModeSessions.length
            )
          : 0,
      cardsMode:
        cardsModeSessions.length > 0
          ? Math.round(
              cardsModeSessions.reduce((sum, s) => sum + (s.score || 0), 0) /
                cardsModeSessions.length
            )
          : 0,
    };

    // Completion rate using active sessions (excluding archived)
    const completionRate =
      totalSessionsStarted > 0 ? (totalSessionsCompleted / totalSessionsStarted) * 100 : 0;

    // Count skipped questions from active sessions (sessions where lastActionWasSkip is true)
    const totalSkippedQuestions = activeSessions.filter((s) => s.lastActionWasSkip).length;

    // Estimate correct/incorrect answers based on score distribution
    // Assuming each question is worth roughly 10 points on average
    const estimatedCorrectAnswers = Math.round(totalScore / 10);
    const estimatedIncorrectAnswers = Math.max(
      0,
      totalQuestionsAnswered - estimatedCorrectAnswers - totalSkippedQuestions
    );

    return {
      totalSessionsCompleted,
      totalSessionsStarted,
      averageScore: Math.round(averageScore * 100) / 100,
      totalQuestionsAnswered,
      courseBreakdown,
      averageScoreByMode,
      completionRate: Math.round(completionRate * 100) / 100,
      totalSkippedQuestions,
      correctAnswersEstimate: estimatedCorrectAnswers,
      incorrectAnswersEstimate: estimatedIncorrectAnswers,
    };
  },
});

// Get recent activity for the stats page
export const getRecentActivity = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sessions"),
      _creationTime: v.number(),
      sessionId: v.string(),
      score: v.number(),
      courseType: v.optional(v.string()),
      isCompleted: v.boolean(),
      currentQuestion: v.number(),
      totalQuestions: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").order("desc").take(50);

    // Filter out archived sessions and return only the fields we need for stats, excluding messages
    return sessions
      .filter((session) => !session.isArchived) // Exclude archived sessions
      .slice(0, 20) // Take 20 after filtering
      .map((session) => ({
        _id: session._id,
        _creationTime: session._creationTime,
        sessionId: session.sessionId,
        score: session.score,
        courseType: session.courseType,
        isCompleted: session.isCompleted,
        currentQuestion: session.currentQuestion,
        totalQuestions: session.totalQuestions,
      }));
  },
});

// Get score distribution for charts
export const getScoreDistribution = query({
  args: {},
  returns: v.array(
    v.object({
      scoreRange: v.string(),
      count: v.number(),
    })
  ),
  handler: async (ctx) => {
    const completedSessions = await ctx.db
      .query("sessions")
      .filter((q) => q.eq(q.field("isCompleted"), true))
      .collect()
      .then((sessions) => sessions.filter((session) => !session.isArchived)); // Exclude archived sessions

    const distribution = {
      "0-20": 0,
      "21-40": 0,
      "41-60": 0,
      "61-80": 0,
      "81-100": 0,
    };

    completedSessions.forEach((session) => {
      const score = session.score || 0;
      if (score <= 20) distribution["0-20"]++;
      else if (score <= 40) distribution["21-40"]++;
      else if (score <= 60) distribution["41-60"]++;
      else if (score <= 80) distribution["61-80"]++;
      else distribution["81-100"]++;
    });

    return [
      { scoreRange: "0-20", count: distribution["0-20"] },
      { scoreRange: "21-40", count: distribution["21-40"] },
      { scoreRange: "41-60", count: distribution["41-60"] },
      { scoreRange: "61-80", count: distribution["61-80"] },
      { scoreRange: "81-100", count: distribution["81-100"] },
    ];
  },
});

// AgentFlow: Track token usage for AI interactions
export const trackTokenUsage = mutation({
  args: {
    sessionId: v.optional(v.string()),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    totalTokens: v.number(),
    cost: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("tokenUsage", {
      sessionId: args.sessionId || "anonymous",
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      totalTokens: args.totalTokens,
      timestamp: Date.now(),
      ...(args.cost && { cost: args.cost }),
    });
    return null;
  },
});

export const getStats = query({
  args: {},
  returns: v.object({
    totalSessions: v.number(),
    activeSessions: v.number(),
    completedSessions: v.number(),
    totalQuestions: v.number(),
    averageScore: v.number(),
    courseBreakdown: v.record(v.string(), v.number()),
    recentActivity: v.array(
      v.object({
        sessionId: v.string(),
        courseType: v.optional(v.string()),
        score: v.number(),
        completedAt: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const sessions = await ctx.db.query("sessions").collect();

    // Filter for active sessions (sessions with progress or messages) and exclude archived sessions
    const activeSessions = sessions.filter(
      (session) =>
        (session.currentQuestion > 0 ||
          (session.messages && session.messages.length > 0) ||
          session.courseType) &&
        !session.isArchived // Exclude archived sessions from stats
    );

    const completedSessions = activeSessions.filter((session) => session.isCompleted);

    // Calculate total questions answered across all active (non-archived) sessions
    const totalQuestions = activeSessions.reduce(
      (sum, session) => sum + session.currentQuestion,
      0
    );

    // Calculate average score from active (non-archived) sessions
    const totalScore = activeSessions.reduce((sum, session) => sum + session.score, 0);
    const averageScore =
      activeSessions.length > 0 ? Math.round(totalScore / activeSessions.length) : 0;

    // Calculate course breakdown from active (non-archived) sessions - removed howConvexWorks
    const courseBreakdown = {
      chatMode: activeSessions.filter((s) => s.courseType === "build-apps").length,
      cardsMode: activeSessions.filter((s) => s.courseType === "build-apps-cards").length,
    };

    // Recent activity (last 10 completed sessions)
    const recentActivity = completedSessions
      .filter((session) => session.isCompleted)
      .sort((a, b) => (b.completedAt || b._creationTime) - (a.completedAt || a._creationTime))
      .slice(0, 10)
      .map((session) => ({
        sessionId: session.sessionId,
        courseType: session.courseType,
        score: session.score,
        completedAt: session.completedAt || session._creationTime,
      }));

    return {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      completedSessions: completedSessions.length,
      totalQuestions,
      averageScore,
      courseBreakdown,
      recentActivity,
    };
  },
});
