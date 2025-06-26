import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { getQuestionsForCourse, type Question } from "./questions";

// Debug logging to verify configuration
console.log("🔧 CourseAgent OpenAI Configuration:", {
  hasApiKey: !!process.env.CONVEX_OPENAI_API_KEY,
  apiKeyPrefix: process.env.CONVEX_OPENAI_API_KEY?.substring(0, 10) + "...",
});

// AgentFlow-powered response generation with full session management
export const generateResponseWithAgent = action({
  args: {
    sessionId: v.string(),
    userMessage: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    try {
      console.log("🤖 Starting AgentFlow generation for session:", args.sessionId);

      // Check API key first
      if (!process.env.CONVEX_OPENAI_API_KEY) {
        throw new Error("CONVEX_OPENAI_API_KEY environment variable is not configured");
      }

      const session: any = await ctx.runQuery(api.course.getSession, {
        sessionId: args.sessionId,
      });

      if (!session) {
        throw new Error(`Session not found: ${args.sessionId}`);
      }

      console.log("🔍 Session found:", {
        sessionId: args.sessionId,
        courseType: session.courseType,
        currentQuestion: session.currentQuestion,
        messageCount: session.messages?.length || 0,
      });

      // Check if session is under admin takeover
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

      // Handle "start" message specially for initial course setup
      if (args.userMessage.toLowerCase().trim() === "start") {
        console.log("🎯 Handling course start with AgentFlow...");

        const welcomeMessage = `🚀 **Welcome to AgentFlow Enhanced Learning!**

Excellent choice! Let's learn how to build apps with Convex using our advanced AI-powered learning system.

We'll start with the basics and work our way up to building real applications. Convex makes it incredibly easy to go from idea to deployed app.

Here's how you start a new Convex project:

\`\`\`bash
npx create-convex@latest my-app
cd my-app
npm run dev
\`\`\`

**First question:** When starting a new Convex project, what's the very first command you would run? (Hint: it involves npm or npx)

*✨ Powered by AgentFlow for an enhanced learning experience*`;

        // Add the welcome message to session
        await ctx.runMutation(api.course.addMessage, {
          sessionId: args.sessionId,
          role: "assistant",
          content: welcomeMessage,
        });

        console.log("✅ AgentFlow course started successfully");
        return welcomeMessage;
      }

      // Get active Convex documentation for enhanced responses
      const convexDocs = await ctx.runQuery(api.course.getConvexDocs);
      const docReferences = convexDocs
        .filter((doc) => doc.isActive)
        .map((doc) => `- ${doc.docType}: ${doc.url}`)
        .join("\n");

      // Create system prompt for AgentFlow
      const systemPrompt = `You are an AI instructor powered by AgentFlow teaching developers how to build applications with Convex.dev. You are helping users learn through a structured course with guided questions.

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

✨ AgentFlow Enhanced Learning Experience ✨

Convex Documentation References:
${docReferences}`;

      // Build conversation context
      const messages: Array<{ role: string; content: string }> = [
        { role: "system", content: systemPrompt },
        ...session.messages.map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: args.userMessage },
      ];

      console.log("🎯 Generating AgentFlow response with context:", {
        systemPromptLength: systemPrompt.length,
        conversationLength: messages.length - 1, // exclude system message
        userMessage: args.userMessage.substring(0, 50) + "...",
      });

      // Use direct OpenAI API call with AgentFlow enhancement
      const response: Response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CONVEX_OPENAI_API_KEY}`,
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
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data: any = await response.json();
      const aiResponse: string = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error("No response generated from OpenAI");
      }

      console.log("✅ AgentFlow response generated:", {
        responseLength: aiResponse.length,
        responsePreview: aiResponse.substring(0, 100) + "...",
      });

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

      // Add AI response to session
      await ctx.runMutation(api.course.addMessage, {
        sessionId: args.sessionId,
        role: "assistant",
        content: aiResponse,
      });

      // Handle course progression and scoring
      const newQuestionNumber = session.currentQuestion + 1;

      // Get dynamic course settings with difficulty support
      const difficulty = session.difficulty || "default";
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

        console.log("📊 Course progress updated:", {
          newQuestion: newQuestionNumber,
          totalQuestions,
          newScore,
          maxScore,
          wasSkip: isSkipMessage,
        });
      }

      console.log("🎉 AgentFlow session completed successfully");
      return aiResponse;
    } catch (error) {
      console.error("❌ Error with AgentFlow generation:", error);
      throw error; // Re-throw error instead of fallback
    }
  },
});
