import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getQuestionsForCourse, generateRandomizedQuestionOrder, type Question } from "./questions";

// CONFIGURABLE SETTINGS - Change these values to adjust course parameters
const COURSE_SETTINGS = {
  "how-convex-works": {
    totalQuestions: 10, // Change this number to adjust total questions for "How Convex Works" course
    maxScore: 100,
  },
  "build-apps": {
    totalQuestions: 7, // Change this number to adjust total questions for "Build Apps" course
    maxScore: 100,
  },
  "build-apps-cards": {
    totalQuestions: 7, // Same content as build-apps but in card format
    maxScore: 100,
  },
};

export const createSession = mutation({
  args: {
    sessionId: v.string(),
    courseType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (existingSession) {
      return existingSession._id;
    }

    // Set default total questions based on course type, or use default
    const courseSettings = args.courseType
      ? COURSE_SETTINGS[args.courseType as keyof typeof COURSE_SETTINGS]
      : null;
    const totalQuestions = courseSettings?.totalQuestions || 10;

    // Generate randomized question order for this session
    const randomizedQuestionOrder = generateRandomizedQuestionOrder(totalQuestions);

    return await ctx.db.insert("sessions", {
      sessionId: args.sessionId,
      currentQuestion: 0,
      totalQuestions,
      score: 0,
      messages: [],
      isCompleted: false,
      courseType: args.courseType,
      randomizedQuestionOrder,
    });
  },
});

export const getSession = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

export const addMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    const newMessage = {
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
    };

    await ctx.db.patch(session._id, {
      messages: [...session.messages, newMessage],
    });
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
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session) {
      throw new Error("Session not found");
    }

    const updates: any = {};
    if (args.courseType !== undefined) {
      updates.courseType = args.courseType;
      // Update total questions when course type changes and generate new randomized order
      const courseSettings = COURSE_SETTINGS[args.courseType as keyof typeof COURSE_SETTINGS];
      if (courseSettings) {
        updates.totalQuestions = courseSettings.totalQuestions;
        updates.randomizedQuestionOrder = generateRandomizedQuestionOrder(
          courseSettings.totalQuestions
        );
      }
    }
    if (args.currentQuestion !== undefined) updates.currentQuestion = args.currentQuestion;
    if (args.totalQuestions !== undefined) updates.totalQuestions = args.totalQuestions;
    if (args.score !== undefined) updates.score = args.score;
    if (args.isCompleted !== undefined) updates.isCompleted = args.isCompleted;
    if (args.lastActionWasSkip !== undefined) updates.lastActionWasSkip = args.lastActionWasSkip;

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
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

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
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!session || !session.courseType || !session.randomizedQuestionOrder) {
      return [];
    }

    const questions = getQuestionsForCourse(session.courseType);
    const randomizedOrder = session.randomizedQuestionOrder;

    // Return questions in the randomized order, limited to totalQuestions
    const totalQuestions = session.totalQuestions || questions.length;
    return randomizedOrder
      .slice(0, totalQuestions)
      .map((index) => questions[index])
      .filter(Boolean); // Remove any undefined questions
  },
});

// System prompt for "How Convex Works" course
const getHowConvexWorksSystemPrompt = (session: any, currentQuestion: Question | null): string => {
  const questionContext = currentQuestion
    ? `
CURRENT QUESTION TO ASK:
**${currentQuestion.question}**

EXPECTED ANSWER: ${currentQuestion.answer}
EXPLANATION TO PROVIDE: ${currentQuestion.explanation}
TOPICS COVERED: ${currentQuestion.topics.join(", ")}
`
    : `
CURRENT STATUS: Course completed or question not available.
`;

  return `You are an AI instructor teaching about Convex.dev fundamentals. You are helping users understand how Convex works through a structured interactive course with randomized questions.

COURSE PROGRESS:
- Current question: ${session.currentQuestion + 1}/${session.totalQuestions}
- Current score: ${session.score}/${COURSE_SETTINGS["how-convex-works"].maxScore}

${questionContext}

CONVEX KNOWLEDGE BASE:
Convex is a reactive backend-as-a-service that provides:
- Real-time database with automatic subscriptions
- Server functions (queries, mutations, actions)
- Built-in authentication
- File storage
- Scheduling and cron jobs
- Full-text search
- HTTP endpoints

KEY CONCEPTS TO TEACH:
1. Reactivity: All queries are live-updating subscriptions
2. Queries: Read data from the database (reactive, cached)
3. Mutations: Write data to the database (transactional)
4. Actions: Call external APIs, send emails, etc. (can't access db directly)
5. Schema: Define your data structure with validators
6. Indexes: Optimize queries for performance
7. Real-time: All queries are automatically live-updating

TEACHING APPROACH:
- Ask the specific question provided above in bold format
- Focus on conceptual understanding related to the question topics
- Use analogies and examples relevant to the question
- After user responds, check if their answer includes the expected answer concepts
- Provide the explanation when revealing the correct answer
- ALWAYS include code examples when explaining concepts
- Use markdown code blocks with proper language tags (javascript, typescript, bash, etc.)
- After each user response, increment their score based on understanding (0-10 points per question)
- Move to next question after user demonstrates understanding
- ALWAYS format questions in bold using **Question text here?** markdown syntax

RANDOMIZED LEARNING PATH:
Questions are presented in a randomized order for each session to ensure varied learning experiences. Each user gets a unique question sequence while covering the same core Convex concepts.

CODE EXAMPLE GUIDELINES:
- Show practical, working code examples relevant to the current question
- Use proper syntax highlighting with language tags
- Explain what each code snippet does
- Show both frontend and backend code when relevant
- Include file paths when helpful (e.g., "In convex/messages.ts:")

Be encouraging, provide clear explanations with code examples, and ask follow-up questions to test understanding. Keep responses concise but informative. Track progress and award points for good answers.

SKIP HANDLING:
If a user sends "skip", acknowledge they're skipping this question, provide the explanation summary for the current question, and move to the next topic. Be supportive and explain that skipping is okay for learning at their own pace.`;
};

// System prompt for "Build Apps" course
const getBuildAppsSystemPrompt = (session: any, currentQuestion: Question | null): string => {
  const questionContext = currentQuestion
    ? `
CURRENT QUESTION TO ASK:
**${currentQuestion.question}**

EXPECTED ANSWER: ${currentQuestion.answer}
EXPLANATION TO PROVIDE: ${currentQuestion.explanation}
TOPICS COVERED: ${currentQuestion.topics.join(", ")}
`
    : `
CURRENT STATUS: Course completed or question not available.
`;

  return `You are an AI instructor teaching practical Convex.dev development. You are helping users learn to build applications with Convex through a structured interactive course with randomized questions.

COURSE PROGRESS:
- Current question: ${session.currentQuestion + 1}/${session.totalQuestions}
- Current score: ${session.score}/${COURSE_SETTINGS["build-apps"].maxScore}

${questionContext}

CONVEX DEVELOPMENT WORKFLOW:
1. Setup: npx create-convex@latest
2. Define schema in convex/schema.ts
3. Write functions in convex/ directory
4. Deploy with 'npx convex dev'
5. Use from frontend with React hooks

PRACTICAL SKILLS TO TEACH:
1. Project setup and configuration
2. Schema design and validation
3. Writing queries, mutations, and actions
4. Frontend integration with React hooks
5. Authentication setup
6. File storage implementation
7. Deployment and production considerations

BEST PRACTICES:
- Use queries for reading data
- Use mutations for writing data
- Use actions for external API calls
- Define proper indexes for performance
- Validate all function arguments
- Keep functions focused and small
- Handle errors gracefully

TEACHING APPROACH:
- Ask the specific question provided above in bold format
- Provide practical, actionable examples related to the question topics
- Show complete, working code snippets
- After user responds, check if their answer includes the expected answer concepts
- Provide the explanation when revealing the correct answer
- Guide through common patterns relevant to the current question
- Build progressively complex examples
- ALWAYS include code examples for every concept
- Use markdown code blocks with proper language tags
- Show file structure and organization
- After each user response, increment their score based on understanding (0-7 points per question)
- Move to next question after user demonstrates understanding
- ALWAYS format questions in bold using **Question text here?** markdown syntax

RANDOMIZED LEARNING PATH:
Questions are presented in a randomized order for each session to ensure varied learning experiences. Each user gets a unique question sequence while covering the same practical Convex development skills.

CODE EXAMPLE GUIDELINES:
- Provide complete, copy-pasteable code examples relevant to the current question
- Include file paths (e.g., "convex/messages.ts", "src/App.tsx")
- Show both backend functions and frontend usage
- Explain each part of the code
- Include error handling examples
- Show testing and debugging approaches

Be practical, provide comprehensive code examples, and guide users through building real functionality. Keep responses actionable and focused on implementation with plenty of code samples. Track progress and award points for good answers.

SKIP HANDLING:
If a user sends "skip", acknowledge they're skipping this question, provide the explanation summary for the current question, and move to the next topic. Be supportive and explain that skipping is okay for learning at their own pace.`;
};

export const generateResponse = action({
  args: {
    sessionId: v.string(),
    userMessage: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const session = await ctx.runQuery(api.course.getSession, {
      sessionId: args.sessionId,
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Check if OpenAI API key is configured
    if (!process.env.CONVEX_OPENAI_API_KEY) {
      throw new Error("CONVEX_OPENAI_API_KEY environment variable is not configured");
    }

    // Get the current question for this session
    const currentQuestion = await ctx.runQuery(api.course.getCurrentQuestion, {
      sessionId: args.sessionId,
    });

    // Get the appropriate system prompt based on course type
    const systemPrompt: string =
      session.courseType === "how-convex-works"
        ? getHowConvexWorksSystemPrompt(session, currentQuestion)
        : getBuildAppsSystemPrompt(session, currentQuestion); // Same system prompt for both build-apps formats

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

    // Add both user message and AI response to the session
    await ctx.runMutation(api.course.addMessage, {
      sessionId: args.sessionId,
      role: "user",
      content: args.userMessage,
    });

    await ctx.runMutation(api.course.addMessage, {
      sessionId: args.sessionId,
      role: "assistant",
      content: aiResponse,
    });

    // Increment question counter and calculate score
    const newQuestionNumber = session.currentQuestion + 1;
    const courseSettings = session.courseType
      ? COURSE_SETTINGS[session.courseType as keyof typeof COURSE_SETTINGS]
      : null;
    const maxScore = courseSettings?.maxScore || 100;
    const totalQuestions = session.totalQuestions || courseSettings?.totalQuestions || 10;
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
