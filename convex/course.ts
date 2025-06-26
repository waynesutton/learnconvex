import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getQuestionsForCourse, generateRandomizedQuestionOrder, type Question } from "./questions";

// Default settings - used only for initialization when no database settings exist
const DEFAULT_COURSE_SETTINGS = {
  "build-apps": { totalQuestions: 10, maxScore: 100 },
  "build-apps-cards": { totalQuestions: 10, maxScore: 100 },
};

// Get course settings from database with fallback to defaults
export const getCourseSettings = query({
  args: {
    courseType: v.string(),
    difficulty: v.optional(v.string()),
  },
  returns: v.object({
    totalQuestions: v.number(),
    maxScore: v.number(),
  }),
  handler: async (ctx, args) => {
    const difficulty = args.difficulty || "default";
    const settings = await ctx.db
      .query("courseSettings")
      .withIndex("by_courseType_difficulty", (q) =>
        q.eq("courseType", args.courseType).eq("difficulty", difficulty)
      )
      .first();

    if (settings) {
      return {
        totalQuestions: settings.totalQuestions,
        maxScore: settings.maxScore,
      };
    }

    // Return defaults if no settings found
    const defaultSettings =
      DEFAULT_COURSE_SETTINGS[args.courseType as keyof typeof DEFAULT_COURSE_SETTINGS];
    return defaultSettings || { totalQuestions: 10, maxScore: 100 };
  },
});

// Get all course settings for admin interface
export const getAllCourseSettings = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("courseSettings"),
      _creationTime: v.number(),
      courseType: v.string(),
      difficulty: v.string(),
      totalQuestions: v.number(),
      maxScore: v.number(),
      updatedAt: v.number(),
      updatedBy: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("courseSettings").collect();
  },
});

// Initialize default course settings if they don't exist
export const initializeCourseSettings = mutation({
  args: {
    updatedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const courseTypes = ["build-apps", "build-apps-cards"];

    for (const courseType of courseTypes) {
      const existing = await ctx.db
        .query("courseSettings")
        .withIndex("by_courseType_difficulty", (q) =>
          q.eq("courseType", courseType).eq("difficulty", "default")
        )
        .first();

      if (!existing) {
        const defaultSettings =
          DEFAULT_COURSE_SETTINGS[courseType as keyof typeof DEFAULT_COURSE_SETTINGS];
        await ctx.db.insert("courseSettings", {
          courseType,
          difficulty: "default",
          totalQuestions: defaultSettings.totalQuestions,
          maxScore: defaultSettings.maxScore,
          updatedAt: Date.now(),
          updatedBy: args.updatedBy || "system",
        });
      }
    }
    return null;
  },
});

// Update course settings
export const updateCourseSettings = mutation({
  args: {
    courseType: v.string(),
    difficulty: v.string(),
    totalQuestions: v.number(),
    maxScore: v.number(),
    updatedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("courseSettings")
      .withIndex("by_courseType_difficulty", (q) =>
        q.eq("courseType", args.courseType).eq("difficulty", args.difficulty)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        totalQuestions: args.totalQuestions,
        maxScore: args.maxScore,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
    } else {
      await ctx.db.insert("courseSettings", {
        courseType: args.courseType,
        difficulty: args.difficulty,
        totalQuestions: args.totalQuestions,
        maxScore: args.maxScore,
        updatedAt: Date.now(),
        updatedBy: args.updatedBy,
      });
    }
    return null;
  },
});

// Get Convex documentation links
export const getConvexDocs = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("convexDocs"),
      _creationTime: v.number(),
      docType: v.string(),
      url: v.string(),
      content: v.optional(v.string()),
      lastFetched: v.number(),
      isActive: v.boolean(),
      updatedBy: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db
      .query("convexDocs")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

// Update Convex documentation links
export const updateConvexDocs = mutation({
  args: {
    docType: v.string(),
    url: v.string(),
    content: v.optional(v.string()),
    isActive: v.boolean(),
    updatedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("convexDocs")
      .filter((q) => q.eq(q.field("docType"), args.docType))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        url: args.url,
        content: args.content,
        lastFetched: Date.now(),
        isActive: args.isActive,
        updatedBy: args.updatedBy,
      });
    } else {
      await ctx.db.insert("convexDocs", {
        docType: args.docType,
        url: args.url,
        content: args.content,
        lastFetched: Date.now(),
        isActive: args.isActive,
        updatedBy: args.updatedBy,
      });
    }
    return null;
  },
});

// Initialize default Convex docs
export const initializeConvexDocs = mutation({
  args: { updatedBy: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const defaultDocs = [
      {
        docType: "home",
        url: "https://docs.convex.dev/home",
        isActive: true,
      },
      {
        docType: "llms",
        url: "https://docs.convex.dev/llms.txt",
        isActive: true,
      },
    ];

    for (const doc of defaultDocs) {
      const existing = await ctx.db
        .query("convexDocs")
        .withIndex("by_docType", (q) => q.eq("docType", doc.docType))
        .first();

      if (!existing) {
        await ctx.db.insert("convexDocs", {
          ...doc,
          lastFetched: Date.now(),
          updatedBy: args.updatedBy || "system",
        });
      }
    }

    return null;
  },
});

export const createSession = mutation({
  args: {
    sessionId: v.string(),
    courseType: v.optional(v.string()),
    difficulty: v.optional(v.string()),
    forceNew: v.optional(v.boolean()), // Add option to force new session creation
  },
  returns: v.id("sessions"),
  handler: async (ctx, args) => {
    console.log(
      `🔍 Creating session: ${args.sessionId}, courseType: ${args.courseType}, forceNew: ${args.forceNew}`
    );

    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    // If forceNew is true, delete existing session and create fresh one
    if (args.forceNew && existingSession) {
      console.log(`🗑️ Deleting existing session for fresh start: ${args.sessionId}`);
      await ctx.db.delete(existingSession._id);
    } else if (existingSession && !args.forceNew) {
      console.log(`♻️ Updating existing session: ${args.sessionId}`);
      // If courseType is provided and different from existing, update the session
      if (args.courseType && existingSession.courseType !== args.courseType) {
        // Get dynamic course settings for the new course type
        const difficulty = args.difficulty || "default";

        const settings = await ctx.db
          .query("courseSettings")
          .withIndex("by_courseType_difficulty", (q) =>
            q.eq("courseType", args.courseType!).eq("difficulty", difficulty)
          )
          .first();

        let totalQuestions = 10;
        if (settings) {
          totalQuestions = settings.totalQuestions;
        } else {
          const defaultSettings =
            DEFAULT_COURSE_SETTINGS[args.courseType as keyof typeof DEFAULT_COURSE_SETTINGS];
          totalQuestions = defaultSettings?.totalQuestions || 10;
        }

        // Generate new randomized question order
        const randomizedQuestionOrder = generateRandomizedQuestionOrder(totalQuestions);

        // Update the existing session
        await ctx.db.patch(existingSession._id, {
          courseType: args.courseType,
          difficulty: difficulty,
          totalQuestions,
          randomizedQuestionOrder,
          currentQuestion: 0, // Reset progress
          score: 0, // Reset score
          isCompleted: false, // Reset completion status
          messages: [], // Clear messages for fresh start
        });
      }

      return existingSession._id;
    }

    // Get dynamic course settings with fallback to defaults
    let totalQuestions = 10;
    if (args.courseType) {
      const difficulty = args.difficulty || "default";

      const settings = await ctx.db
        .query("courseSettings")
        .withIndex("by_courseType_difficulty", (q) =>
          q.eq("courseType", args.courseType!).eq("difficulty", difficulty)
        )
        .first();

      if (settings) {
        totalQuestions = settings.totalQuestions;
      } else {
        const defaultSettings =
          DEFAULT_COURSE_SETTINGS[args.courseType as keyof typeof DEFAULT_COURSE_SETTINGS];
        totalQuestions = defaultSettings?.totalQuestions || 10;
      }
    }

    // Generate randomized question order for this session
    const randomizedQuestionOrder = generateRandomizedQuestionOrder(totalQuestions);

    const newSessionId = await ctx.db.insert("sessions", {
      sessionId: args.sessionId,
      currentQuestion: 0,
      totalQuestions,
      score: 0,
      messages: [],
      isCompleted: false,
      courseType: args.courseType,
      difficulty: args.difficulty || "default",
      randomizedQuestionOrder,
    });

    return newSessionId;
  },
});

export const getSession = query({
  args: { sessionId: v.string() },
  returns: v.union(
    v.object({
      courseType: v.optional(v.string()),
      difficulty: v.optional(v.string()),
      totalQuestions: v.optional(v.number()),
      lastActionWasSkip: v.optional(v.boolean()),
      agentThreadId: v.optional(v.string()),
      randomizedQuestionOrder: v.optional(v.array(v.number())),
      completedAt: v.optional(v.number()),
      timeSpent: v.optional(v.number()),
      hintsUsed: v.optional(v.number()),
      correctAnswers: v.optional(v.number()),
      skippedQuestions: v.optional(v.number()),
      _id: v.id("sessions"),
      _creationTime: v.number(),
      sessionId: v.string(),
      currentQuestion: v.number(),
      score: v.number(),
      isCompleted: v.boolean(),
      createdAt: v.optional(v.number()),
      messages: v.array(
        v.object({
          role: v.string(),
          content: v.string(),
          timestamp: v.number(),
          messageId: v.optional(v.string()), // Add messageId field
          isVoiceMessage: v.optional(v.boolean()),
          voiceCommand: v.optional(v.string()),
          isAdminIntervention: v.optional(v.boolean()),
          adminNote: v.optional(v.string()),
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

    // Ensure messages array exists (for backward compatibility)
    if (!session.messages) {
      return {
        ...session,
        messages: [],
      };
    }

    return session;
  },
});

export const addMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.string(),
    content: v.string(),
    isVoiceMessage: v.optional(v.boolean()),
    voiceCommand: v.optional(v.string()),
    isAdminIntervention: v.optional(v.boolean()),
    adminNote: v.optional(v.string()),
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

    const timestamp = Date.now();
    const newMessage = {
      role: args.role,
      content: args.content,
      timestamp,
      messageId: `${args.sessionId}_msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      ...(args.isVoiceMessage && { isVoiceMessage: args.isVoiceMessage }),
      ...(args.voiceCommand && { voiceCommand: args.voiceCommand }),
      ...(args.isAdminIntervention && { isAdminIntervention: args.isAdminIntervention }),
      ...(args.adminNote && { adminNote: args.adminNote }),
    };

    // Ensure messages array exists (for backward compatibility)
    const currentMessages = session.messages || [];

    await ctx.db.patch(session._id, {
      messages: [...currentMessages, newMessage],
    });

    return null;
  },
});

export const updateSession = mutation({
  args: {
    sessionId: v.string(),
    courseType: v.optional(v.string()),
    currentQuestion: v.optional(v.number()),
    totalQuestions: v.optional(v.number()),
    score: v.optional(v.number()),
    isCompleted: v.optional(v.boolean()),
    lastActionWasSkip: v.optional(v.boolean()),
    // AgentFlow fields
    agentThreadId: v.optional(v.string()),
    workflowId: v.optional(v.string()),
    // Allow graceful handling of missing sessions
    createIfMissing: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session) {
      console.log(`⚠️ Session not found: ${args.sessionId}`);

      // If createIfMissing is true, create a basic session
      if (args.createIfMissing) {
        console.log(`🔄 Creating missing session: ${args.sessionId}`);
        await ctx.db.insert("sessions", {
          sessionId: args.sessionId,
          courseType: args.courseType || "build-apps",
          difficulty: "default",
          currentQuestion: args.currentQuestion || 0,
          totalQuestions: args.totalQuestions || 10,
          score: args.score || 0,
          isCompleted: args.isCompleted || false,
          messages: [],
        });
        return null;
      }

      // Just log and return instead of throwing - don't break the flow
      console.log(`Session ${args.sessionId} not found, skipping update`);
      return null;
    }

    const updates: any = {};
    if (args.courseType !== undefined) {
      updates.courseType = args.courseType;
      // Update total questions when course type changes and generate new randomized order
      const difficulty = "beginning"; // Default to beginning when switching course types
      const settings = await ctx.db
        .query("courseSettings")
        .withIndex("by_courseType_difficulty", (q) =>
          q.eq("courseType", args.courseType!).eq("difficulty", difficulty)
        )
        .first();

      if (settings) {
        updates.totalQuestions = settings.totalQuestions;
        updates.randomizedQuestionOrder = generateRandomizedQuestionOrder(settings.totalQuestions);
      } else {
        const defaultSettings =
          DEFAULT_COURSE_SETTINGS[args.courseType as keyof typeof DEFAULT_COURSE_SETTINGS];
        const totalQuestions = defaultSettings?.totalQuestions || 10;
        updates.totalQuestions = totalQuestions;
        updates.randomizedQuestionOrder = generateRandomizedQuestionOrder(totalQuestions);
      }
    }
    if (args.currentQuestion !== undefined) updates.currentQuestion = args.currentQuestion;
    if (args.totalQuestions !== undefined) updates.totalQuestions = args.totalQuestions;
    if (args.score !== undefined) updates.score = args.score;
    if (args.isCompleted !== undefined) updates.isCompleted = args.isCompleted;
    if (args.lastActionWasSkip !== undefined) updates.lastActionWasSkip = args.lastActionWasSkip;
    // AgentFlow updates
    if (args.agentThreadId !== undefined) updates.agentThreadId = args.agentThreadId;
    if (args.workflowId !== undefined) updates.workflowId = args.workflowId;

    await ctx.db.patch(session._id, updates);
  },
});

// Helper function to get the current question for a session
export const getCurrentQuestion = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.union(
    v.object({
      question: v.string(),
      answer: v.string(),
      explanation: v.string(),
      topics: v.array(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || !session.courseType || !session.randomizedQuestionOrder) {
      return null;
    }

    const questions = getQuestionsForCourse(session.courseType);
    const randomizedOrder = session.randomizedQuestionOrder;

    if (session.currentQuestion >= randomizedOrder.length) {
      return null; // Course completed
    }

    const questionIndex = randomizedOrder[session.currentQuestion];
    return questions[questionIndex] || null;
  },
});

// Get all randomized questions for cards mode
export const getRandomizedQuestions = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.array(
    v.object({
      question: v.string(),
      answer: v.string(),
      explanation: v.string(),
      topics: v.array(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!session || !session.courseType || !session.randomizedQuestionOrder) {
      return [];
    }

    const questions = getQuestionsForCourse(session.courseType);
    const randomizedOrder = session.randomizedQuestionOrder;

    // Return questions in the randomized order, limited to totalQuestions
    const totalQuestions = session.totalQuestions || questions.length;
    const result = randomizedOrder
      .slice(0, totalQuestions)
      .map((index) => questions[index])
      .filter(Boolean); // Remove any undefined questions

    return result;
  },
});

// System prompt for build-apps courses
const getBuildAppsSystemPrompt = (
  difficulty: string,
  isCardsMode: boolean = false,
  docReferences: string = ""
): string => {
  const basePrompt = `You are an AI instructor teaching developers how to build applications with Convex.dev. You are helping users learn through ${isCardsMode ? "interactive flashcards" : "a structured course with guided questions"}.

Your role:
- Teach practical Convex development skills
- Focus on hands-on building and implementation
- Provide clear, actionable code examples
- Guide students through real-world scenarios

Teaching approach:
- Start with fundamental concepts and build up
- Use practical examples and real code
- Encourage experimentation and testing
- Provide helpful debugging tips

When students ask questions or get stuck:
- Give clear, specific answers
- Show working code examples
- Explain the "why" behind concepts
- Suggest next steps for learning

Keep responses focused, practical, and encouraging. You're building confident developers who can create real applications with Convex.

Convex Documentation References:
${docReferences}
`;

  return basePrompt;
};

export const generateResponse = action({
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

    // Check if session is under admin takeover - if so, don't generate AI response
    const isSessionTakenOver = await ctx.runQuery(api.playground.isSessionTakenOver, {
      sessionId: args.sessionId,
    });

    if (isSessionTakenOver) {
      // Just add the user message but don't generate AI response
      await ctx.runMutation(api.course.addMessage, {
        sessionId: args.sessionId,
        role: "user",
        content: args.userMessage,
      });

      return ""; // Return empty response - admin will handle manually
    }

    // Check if OpenAI API key is configured
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      throw new Error("CONVEX_OPENAI_API_KEY environment variable is not configured");
    }

    // Get the current question for this session
    const currentQuestion = await ctx.runQuery(api.course.getCurrentQuestion, {
      sessionId: args.sessionId,
    });

    // Get active Convex documentation for enhanced responses
    const convexDocs = await ctx.runQuery(api.course.getConvexDocs);
    const docReferences = convexDocs
      .filter((doc) => doc.isActive)
      .map((doc) => `- ${doc.docType}: ${doc.url}`)
      .join("\n");

    // Generate system prompt based on course type with documentation references
    const systemPrompt = getBuildAppsSystemPrompt(
      session.difficulty || "beginning",
      session.courseType === "build-apps-cards",
      docReferences
    );

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      ...session.messages.map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: args.userMessage },
    ];

    const response: Response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API Error:", response.status, response.statusText, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: any = await response.json();
    const aiResponse: string = data.choices[0].message.content;

    // Add user message to session only if not already added (for voice messages)
    const lastMessage = session.messages[session.messages.length - 1];
    const isRecentUserMessage =
      lastMessage &&
      lastMessage.role === "user" &&
      lastMessage.content === args.userMessage &&
      Date.now() - lastMessage.timestamp < 5000; // Within 5 seconds

    if (!isRecentUserMessage) {
      await ctx.runMutation(api.course.addMessage, {
        sessionId: args.sessionId,
        role: "user",
        content: args.userMessage,
      });
    }

    await ctx.runMutation(api.course.addMessage, {
      sessionId: args.sessionId,
      role: "assistant",
      content: aiResponse,
    });

    // Increment question counter and calculate score
    const newQuestionNumber = session.currentQuestion + 1;

    // Get dynamic course settings with difficulty support
    const difficulty = session.difficulty || "beginning";
    const courseSettings = session.courseType
      ? await ctx.runQuery(api.course.getCourseSettings, {
          courseType: session.courseType,
          difficulty: difficulty,
        })
      : { maxScore: 100, totalQuestions: 10 };

    const maxScore = courseSettings.maxScore;
    const totalQuestions = session.totalQuestions || courseSettings.totalQuestions;
    const pointsPerQuestion = Math.floor(maxScore / totalQuestions);

    // Check if this is a skip message - don't award full points for skipping
    const isSkipMessage = args.userMessage.toLowerCase().trim() === "skip";
    const scoreToAdd = isSkipMessage ? Math.floor(pointsPerQuestion * 0.3) : pointsPerQuestion; // Only 30% points for skipping
    const newScore = Math.min(session.score + scoreToAdd, maxScore);

    // Only update if we haven't exceeded the total questions
    if (newQuestionNumber <= totalQuestions) {
      await ctx.runMutation(api.course.updateSession, {
        sessionId: args.sessionId,
        currentQuestion: newQuestionNumber,
        score: newScore,
        lastActionWasSkip: isSkipMessage,
      });
    }

    return aiResponse;
  },
});

// Delete Convex documentation link
export const deleteConvexDoc = mutation({
  args: { docType: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("convexDocs")
      .withIndex("by_docType", (q) => q.eq("docType", args.docType))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

// Refresh documentation content by fetching from URL
export const refreshDocContent = mutation({
  args: {
    docType: v.string(),
    url: v.string(),
    updatedBy: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // For now, just update the lastFetched timestamp
    // In a real implementation, you might want to fetch content from the URL
    const existing = await ctx.db
      .query("convexDocs")
      .withIndex("by_docType", (q) => q.eq("docType", args.docType))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastFetched: Date.now(),
        updatedBy: args.updatedBy,
        // Note: In a production app, you might want to fetch actual content here
        // content: await fetchContentFromUrl(args.url),
      });
    } else {
      // Create new entry if it doesn't exist
      await ctx.db.insert("convexDocs", {
        docType: args.docType,
        url: args.url,
        lastFetched: Date.now(),
        isActive: true,
        updatedBy: args.updatedBy || "system",
      });
    }
    return null;
  },
});

// Fetch and update documentation content from external URL
export const fetchAndUpdateDocContent = action({
  args: {
    docType: v.string(),
    url: v.string(),
    updatedBy: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      // Fetch content from the URL
      const response = await fetch(args.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }

      const content = await response.text();

      // Extract relevant content (first 1000 characters for preview)
      const contentPreview = content.substring(0, 1000);

      // Update the documentation entry
      await ctx.runMutation(api.course.updateConvexDocs, {
        docType: args.docType,
        url: args.url,
        content: contentPreview,
        isActive: true,
        updatedBy: args.updatedBy || "system",
      });

      return "Content refreshed successfully";
    } catch (error) {
      console.error("Error fetching documentation content:", error);

      // Still update the lastFetched timestamp even if content fetch failed
      await ctx.runMutation(api.course.refreshDocContent, {
        docType: args.docType,
        url: args.url,
        updatedBy: args.updatedBy,
      });

      throw new Error(`Failed to fetch content from ${args.url}: ${error}`);
    }
  },
});

// End course - works the same as typing "end"
export const endCourse = mutation({
  args: {
    sessionId: v.string(),
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

    // Add end message to session
    await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "user",
      content: "end",
      timestamp: Date.now(),
    });

    // Mark course as completed - keep currentQuestion as is to show actual progress
    await ctx.db.patch(session._id, {
      isCompleted: true,
      completedAt: Date.now(),
      // Don't update currentQuestion - keep it at actual progress when ended
    });

    return null;
  },
});
