import { query } from "./_generated/server";
import { v } from "convex/values";

// Get overall stats for the stats page
export const getOverallStats = query({
  args: {},
  returns: v.object({
    totalSessionsCompleted: v.number(),
    totalSessionsStarted: v.number(),
    averageScore: v.number(),
    totalQuestionsAnswered: v.number(),
    courseBreakdown: v.object({
      chatMode: v.number(),
      cardsMode: v.number(),
      howConvexWorks: v.number(),
    }),
    averageScoreByMode: v.object({
      chatMode: v.number(),
      cardsMode: v.number(),
      howConvexWorks: v.number(),
    }),
    completionRate: v.number(),
    totalSkippedQuestions: v.number(),
    correctAnswersEstimate: v.number(),
    incorrectAnswersEstimate: v.number(),
  }),
  handler: async (ctx) => {
    const allSessions = await ctx.db.query("sessions").collect();

    const completedSessions = allSessions.filter((session) => session.isCompleted);
    const totalSessionsStarted = allSessions.length;
    const totalSessionsCompleted = completedSessions.length;

    // Calculate average score
    const totalScore = completedSessions.reduce((sum, session) => sum + (session.score || 0), 0);
    const averageScore = completedSessions.length > 0 ? totalScore / completedSessions.length : 0;

    // Calculate total questions answered (including skipped)
    const totalQuestionsAnswered = completedSessions.reduce(
      (sum, session) => sum + (session.currentQuestion || 0),
      0
    );

    // Course breakdown
    const courseBreakdown = {
      chatMode: completedSessions.filter((s) => s.courseType === "build-apps").length,
      cardsMode: completedSessions.filter((s) => s.courseType === "build-apps-cards").length,
      howConvexWorks: completedSessions.filter((s) => s.courseType === "how-convex-works").length,
    };

    // Average score by mode
    const chatModeSessions = completedSessions.filter((s) => s.courseType === "build-apps");
    const cardsModeSessions = completedSessions.filter((s) => s.courseType === "build-apps-cards");
    const howConvexWorksSessions = completedSessions.filter(
      (s) => s.courseType === "how-convex-works"
    );

    const averageScoreByMode = {
      chatMode:
        chatModeSessions.length > 0
          ? chatModeSessions.reduce((sum, s) => sum + (s.score || 0), 0) / chatModeSessions.length
          : 0,
      cardsMode:
        cardsModeSessions.length > 0
          ? cardsModeSessions.reduce((sum, s) => sum + (s.score || 0), 0) / cardsModeSessions.length
          : 0,
      howConvexWorks:
        howConvexWorksSessions.length > 0
          ? howConvexWorksSessions.reduce((sum, s) => sum + (s.score || 0), 0) /
            howConvexWorksSessions.length
          : 0,
    };

    // Completion rate
    const completionRate =
      totalSessionsStarted > 0 ? (totalSessionsCompleted / totalSessionsStarted) * 100 : 0;

    // Count skipped questions (sessions where lastActionWasSkip is true)
    const totalSkippedQuestions = allSessions.filter((s) => s.lastActionWasSkip).length;

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
      averageScoreByMode: {
        chatMode: Math.round(averageScoreByMode.chatMode * 100) / 100,
        cardsMode: Math.round(averageScoreByMode.cardsMode * 100) / 100,
        howConvexWorks: Math.round(averageScoreByMode.howConvexWorks * 100) / 100,
      },
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
    const sessions = await ctx.db.query("sessions").order("desc").take(20);

    // Return only the fields we need for stats, excluding messages
    return sessions.map((session) => ({
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
      .collect();

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
