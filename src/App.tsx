import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { MessageRenderer } from "./components/MessageRenderer";

import confetti from "canvas-confetti";
import { DuolingoCards } from "./components/DuolingoCards";

export default function App() {
  const [sessionId, setSessionId] = useState<string>("");
  const [userMessage, setUserMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [courseType, setCourseType] = useState<string | null>(null);
  const [showInitialQuestions, setShowInitialQuestions] = useState(true);
  const [showCompletionPage, setShowCompletionPage] = useState(false);
  const [showCardsMode, setShowCardsMode] = useState(false);
  const [celebrationBadges, setCelebrationBadges] = useState<string[]>([]);
  const [showBadge, setShowBadge] = useState<string | null>(null);

  // AgentFlow state
  const [useAgentFlow, setUseAgentFlow] = useState(false);
  const [agentThreadId, setAgentThreadId] = useState<string | null>(null);

  // Voice state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentlyPlayingMessageId, setCurrentlyPlayingMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousQuestionRef = useRef<number>(0);
  const badgeCountRef = useRef<number>(0);

  // Initialize session ID only once on mount
  useEffect(() => {
    const initializeSession = () => {
      const stored = localStorage.getItem("convex-course-session");
      if (stored && stored !== "") {
        console.log(`🔄 Using stored session: ${stored}`);
        setSessionId(stored);
      } else {
        console.log("🆕 No stored session found - will create new one when course is selected");
        setSessionId("");
      }
    };

    initializeSession();
  }, []);

  const session = useQuery(api.course.getSession, sessionId ? { sessionId } : "skip");
  const createSession = useMutation(api.course.createSession);
  const addMessage = useMutation(api.course.addMessage);
  const updateSession = useMutation(api.course.updateSession);
  const endCourse = useMutation(api.course.endCourse);

  // Enhanced response generation with AgentFlow support
  const generateResponse = useAction(api.course.generateResponse);
  const generateResponseWithAgent = useAction(api.courseAgent.generateResponseWithAgent);

  // Voice actions
  const textToSpeech = useAction(api.voice.textToSpeech);

  // Get dynamic course settings for current session
  const courseSettings = useQuery(
    api.course.getCourseSettings,
    session?.courseType
      ? {
          courseType: session.courseType,
          difficulty: "default", // Use a default difficulty since we removed selection
        }
      : "skip"
  );

  // Calculate dynamic total questions based on settings
  const dynamicTotalQuestions = courseSettings?.totalQuestions || session?.totalQuestions || 10;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserMessage(transcript);
        setIsListening(false);

        // Check for voice commands - but don't auto-send to prevent session interference
        const lowerTranscript = transcript.toLowerCase().trim();
        if (lowerTranscript === "end") {
          // Auto-send voice commands
          handleSendMessage(transcript, true, "end");
        } else if (lowerTranscript === "skip") {
          // Handle skip separately
          handleSkipQuestion(true);
        }
        // For other messages, just set the text - user needs to manually send
      };

      recognitionRef.current.onerror = (event) => {
        console.log("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Voice handlers
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      setUserMessage("");
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleTextToSpeech = async (text: string, messageIndex: number) => {
    if (isPlaying && currentlyPlayingMessageId === `message-${messageIndex}`) {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setCurrentlyPlayingMessageId(null);
      return;
    }

    try {
      setIsPlaying(true);
      setCurrentlyPlayingMessageId(`message-${messageIndex}`);

      // Clean text for TTS (remove markdown formatting)
      const cleanText = text
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/```[\s\S]*?```/g, "code block")
        .replace(/`(.*?)`/g, "$1");

      const base64Audio = await textToSpeech({ text: cleanText });

      // Create audio element and play
      audioRef.current = new Audio(`data:audio/mpeg;base64,${base64Audio}`);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentlyPlayingMessageId(null);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setCurrentlyPlayingMessageId(null);
      };

      await audioRef.current.play();
    } catch (error) {
      console.error("Error with text-to-speech:", error);
      setIsPlaying(false);
      setCurrentlyPlayingMessageId(null);
    }
  };

  // Fun badges and kudos messages
  const celebrationMessages = [
    "🎯 Bullseye!",
    "🚀 Rocket Scientist!",
    "🧠 Brain Power!",
    "⭐ Superstar!",
    "🔥 On Fire!",
    "💎 Diamond Mind!",
    "🏆 Champion!",
    "⚡ Lightning Fast!",
    "🎪 Amazing!",
    "🌟 Brilliant!",
  ];

  // Confetti effect function
  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
      );
      confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      );
    }, 250);
  };

  const handleCourseSelection = async (courseType: string, enableAgentFlow = false) => {
    try {
      console.log(`🚀 Starting course selection: ${courseType}, AgentFlow: ${enableAgentFlow}`);

      // Generate new session ID FIRST
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      console.log(`✨ Creating new session: ${newSessionId}`);

      // Update UI state immediately
      setShowInitialQuestions(false);
      setUseAgentFlow(enableAgentFlow);
      setCourseType(courseType);

      // Archive old session if it exists (but don't fail if it doesn't)
      if (sessionId && sessionId !== newSessionId && sessionId !== "") {
        console.log(`📦 Attempting to archive old session: ${sessionId}`);
        try {
          // Use the OLD session ID to archive
          await updateSession({
            sessionId: sessionId, // Use the OLD session ID
            isCompleted: true,
            currentQuestion: 99,
          });
          console.log(`✅ Old session archived: ${sessionId}`);
        } catch (error) {
          console.log(`⚠️ Could not archive old session (might not exist): ${error}`);
          // Don't fail the whole flow if archiving fails
        }
      } else {
        console.log("🆕 No existing session to archive - starting fresh");
      }

      // Update localStorage and React state with NEW session ID
      localStorage.setItem("convex-course-session", newSessionId);
      setSessionId(newSessionId);

      // Create the fresh session in database with NEW session ID - force new to ensure clean slate
      const sessionCreationResult = await createSession({
        sessionId: newSessionId,
        courseType: courseType,
        difficulty: "default",
        forceNew: true, // Force creation of new session
      });

      console.log(
        `✅ New session created: ${newSessionId} with courseType: ${courseType}, ID: ${sessionCreationResult}`
      );

      // Check if it's the cards mode
      if (courseType === "build-apps-cards") {
        setShowCardsMode(true);
        return;
      }

      // Give session time to propagate - increase wait time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ONLY use AgentFlow - no fallback
      if (enableAgentFlow) {
        console.log("🤖 Initializing AgentFlow...");

        // Set agent thread ID in React state (don't update DB yet)
        setAgentThreadId(newSessionId);

        // Start agent flow with NEW session ID directly
        console.log("🎯 Starting AgentFlow response generation...");
        await generateResponseWithAgent({
          sessionId: newSessionId, // Use the NEW session ID
          userMessage: "start",
        });

        // Only update session with agentThreadId after agent flow succeeds
        try {
          await updateSession({
            sessionId: newSessionId,
            agentThreadId: newSessionId,
          });
          console.log("✅ AgentFlow thread ID saved to session");
        } catch (updateError) {
          console.log("⚠️ Could not save agent thread ID to session:", updateError);
          // Don't fail the whole flow if this update fails
        }

        console.log("✅ AgentFlow initialized successfully");
      } else {
        // Regular mode - no AgentFlow
        console.log("💬 Using regular mode...");
        const welcomeMessage = `Excellent choice! Let's learn how to build apps with Convex.\n\nWe'll start with the basics and work our way up to building real applications. Convex makes it incredibly easy to go from idea to deployed app.\n\nHere's how you start a new Convex project:\n\n\`\`\`bash\nnpx create-convex@latest my-app\ncd my-app\nnpm run dev\n\`\`\`\n\nFirst question: When starting a new Convex project, what's the very first command you would run? (Hint: it involves npm or npx)`;

        await addMessage({
          sessionId: newSessionId, // Use the NEW session ID
          role: "assistant",
          content: welcomeMessage,
        });
      }

      console.log("🎉 Course selection completed successfully");
    } catch (error) {
      console.error("💥 Error in handleCourseSelection:", error);
      // Reset to initial state on error
      setShowInitialQuestions(true);
      setUseAgentFlow(false);
      setCourseType(null);
      throw error; // Re-throw to show user the error
    }
  };

  const handleSendMessage = async (
    messageText?: string,
    isVoice = false,
    voiceCommand?: string
  ) => {
    const messageToSend = messageText || userMessage;
    if (!messageToSend.trim() || isLoading) return;

    // Get current session ID from state - this should be the active session
    const currentSessionId = sessionId;
    console.log(`📤 Sending message with session: ${currentSessionId}`);

    // Check for special "end" command
    if (messageToSend.trim().toLowerCase() === "end") {
      // Log the end command for admin playground visibility
      await addMessage({
        sessionId: currentSessionId,
        role: "user",
        content: `Completed course early with "end" command on question ${(session?.currentQuestion || 0) + 1}`,
        isVoiceMessage: isVoice,
        voiceCommand: voiceCommand,
      });

      // Complete the current session
      await updateSession({
        sessionId: currentSessionId,
        isCompleted: true,
        currentQuestion: session?.currentQuestion || 0,
        totalQuestions: dynamicTotalQuestions,
      });

      setShowCompletionPage(true);
      return;
    }

    setIsLoading(true);
    try {
      // Add voice message tracking to the addMessage calls in the response generation functions
      // For now, we'll override the addMessage call for voice messages
      if (isVoice) {
        await addMessage({
          sessionId: currentSessionId,
          role: "user",
          content: messageToSend,
          isVoiceMessage: true,
          voiceCommand: voiceCommand,
        });
      }

      // Use AgentFlow if enabled, otherwise use regular response generation
      if (useAgentFlow) {
        await generateResponseWithAgent({
          sessionId: currentSessionId,
          userMessage: messageToSend,
        });
      } else {
        await generateResponse({
          sessionId: currentSessionId,
          userMessage: messageToSend,
        });
      }
      setUserMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      throw error; // Re-throw error instead of fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSkipQuestion = async (isVoice = false) => {
    if (isLoading) return;

    // Get current session ID from state - this should be the active session
    const currentSessionId = sessionId;
    console.log(`⏭️ Skipping question with session: ${currentSessionId}`);

    setIsLoading(true);
    try {
      // Track voice skip commands
      if (isVoice) {
        await addMessage({
          sessionId: currentSessionId,
          role: "user",
          content: "skip",
          isVoiceMessage: true,
          voiceCommand: "skip",
        });
      }

      // Use AgentFlow if enabled, otherwise use regular response generation
      if (useAgentFlow) {
        await generateResponseWithAgent({
          sessionId: currentSessionId,
          userMessage: "skip",
        });
      } else {
        await generateResponse({
          sessionId: currentSessionId,
          userMessage: "skip",
        });
      }
    } catch (error) {
      console.error("Error skipping question:", error);
      throw error; // Re-throw error instead of fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCourse = async () => {
    if (!sessionId) return;

    try {
      await endCourse({
        sessionId,
      });
      // The component will re-render when the session isCompleted state changes
    } catch (error) {
      console.error("Error ending course:", error);
    }
  };

  // Show celebration badge
  const showCelebrationBadge = (message: string) => {
    setShowBadge(message);
    setTimeout(() => setShowBadge(null), 2000);
  };

  const resetCourse = async () => {
    console.log("🔄 Starting course reset...");

    try {
      // Archive the current session with OLD session ID (if it exists)
      if (sessionId && sessionId !== "") {
        console.log(`🗂️ Archiving old session during reset: ${sessionId}`);
        try {
          await updateSession({
            sessionId: sessionId, // Use OLD session ID for archiving
            isCompleted: true,
            currentQuestion: 99, // Mark as completed
          });
          console.log(`✅ Old session archived during reset: ${sessionId}`);
        } catch (error) {
          console.log(`⚠️ Could not archive old session during reset: ${error}`);
          // Don't fail reset if archiving fails
        }
      }

      // Clear localStorage and session state
      localStorage.removeItem("convex-course-session");
      setSessionId("");

      // Reset all state variables to initial state
      setShowInitialQuestions(true);
      setShowCompletionPage(false);
      setShowCardsMode(false);
      setCourseType(null);
      setUseAgentFlow(false);
      setAgentThreadId(null);
      setUserMessage("");
      badgeCountRef.current = 0;
      previousQuestionRef.current = 0;

      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setCurrentlyPlayingMessageId(null);

      // Stop any listening
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }

      console.log("🔄 Reset complete - ready for course selection");
    } catch (error) {
      console.error("Error during reset:", error);
      // Reset UI state even if archiving fails
      localStorage.removeItem("convex-course-session");
      setSessionId("");
      setShowInitialQuestions(true);
      setShowCompletionPage(false);
      setShowCardsMode(false);
      setCourseType(null);
      setUseAgentFlow(false);
      setAgentThreadId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Monitor question progress for celebrations
  useEffect(() => {
    if (session && session.currentQuestion > previousQuestionRef.current) {
      // Don't celebrate if the last action was a skip
      if (session.lastActionWasSkip) {
        previousQuestionRef.current = session.currentQuestion;
        return;
      }

      const isFirstQuestion = session.currentQuestion === 1;
      const shouldShowBadge = badgeCountRef.current < 5 && Math.random() < 0.6;

      if (isFirstQuestion) {
        triggerConfetti();
        if (shouldShowBadge) {
          const randomMessage =
            celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
          showCelebrationBadge(randomMessage);
          badgeCountRef.current++;
        }
      } else if (shouldShowBadge) {
        const randomMessage =
          celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
        showCelebrationBadge(randomMessage);
        badgeCountRef.current++;
      }

      previousQuestionRef.current = session.currentQuestion;
    }
  }, [session?.currentQuestion]);

  // Trigger confetti when course is completed
  useEffect(() => {
    if (showCompletionPage) {
      triggerConfetti();
    }
  }, [showCompletionPage]);

  // Monitor for completion in cards mode
  useEffect(() => {
    if (session?.isCompleted && showCardsMode) {
      setShowCompletionPage(true);
      setShowCardsMode(false);
    }
  }, [session?.isCompleted, showCardsMode]);

  // Handle page refresh - if user refreshes while on completion page, clear session state
  useEffect(() => {
    if (session?.isCompleted && showInitialQuestions) {
      // User refreshed on completion page or navigated back to start
      // Clear the session ID so a new one will be created when they select a course
      console.log("🔄 Page refresh detected on completed session - clearing for fresh start");
      localStorage.removeItem("convex-course-session");
      setSessionId("");
    }
  }, [session?.isCompleted, showInitialQuestions]);

  // Handle session state based on session data
  useEffect(() => {
    if (!session || !sessionId) return;

    // If session is completed, show completion page
    if (session.isCompleted && !showCompletionPage) {
      console.log("📋 Session completed - showing completion page");
      setShowCompletionPage(true);
      setShowCardsMode(false);
      setShowInitialQuestions(false);
      return;
    }

    // If session has course type and we're showing initial questions, update UI
    if (session.courseType && showInitialQuestions && !session.isCompleted) {
      console.log(`📚 Resuming session with course: ${session.courseType}`);
      setShowInitialQuestions(false);
      setCourseType(session.courseType);

      // Set up AgentFlow state if session has agent thread
      if (session.agentThreadId) {
        setUseAgentFlow(true);
        setAgentThreadId(session.agentThreadId);
      }

      // Show cards mode if appropriate
      if (session.courseType === "build-apps-cards") {
        setShowCardsMode(true);
      }
    }
  }, [session, sessionId, showInitialQuestions, showCompletionPage]);

  if (session === undefined && sessionId !== "") {
    return (
      <div className="min-h-screen bg-convex-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show completion page
  if (showCompletionPage) {
    return (
      <div className="min-h-screen bg-convex-cream flex flex-col">
        {/* Header */}
        <header className="bg-convex-cream px-4 py-3 pt-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <a
                href="https://convex.dev?utm_source=learnconvexdemoapp"
                target="_blank"
                rel="noopener noreferrer">
                <img src="/convex-black.svg" alt="Convex" className="h-5" />
              </a>
            </div>
            <button
              onClick={resetCourse}
              className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              style={{ borderRadius: "30px" }}>
              Start Over
            </button>
          </div>
        </header>

        {/* Completion Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 sm:p-12 shadow-sm max-w-2xl text-center w-full">
            <div className="text-4xl sm:text-6xl mb-4 sm:mb-6">🎉</div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
              Course Completed!
            </h2>
            <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 leading-relaxed">
              Congratulations! You've successfully completed the{" "}
              {session?.courseType === "build-apps"
                ? "Build Apps (Chat Mode)"
                : "Build Apps (Cards Mode)"}
              course.
            </p>
            <div className="bg-convex-cream rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Final Score: {session?.score || 0}/
                {session?.courseType ? courseSettings?.maxScore || 100 : 100}
              </div>
              <div className="text-sm sm:text-base text-gray-600">
                Questions Completed: {session?.currentQuestion || 0}/
                {courseSettings?.totalQuestions || session?.totalQuestions || 10}
              </div>
            </div>
            <div className="space-y-4">
              <button
                onClick={resetCourse}
                className="w-full px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition-colors text-sm sm:text-base"
                style={{ borderRadius: "30px" }}>
                Take Another Course
              </button>
              <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm">
                <a
                  href="https://convex.dev/docs?utm_source=learnconvexdemoapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-convex-red hover:underline">
                  Read the Docs
                </a>

                <a
                  href="https://convex.dev/community"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-convex-red hover:underline">
                  Join the Community
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-convex-cream px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <a
                href="https://https://convex.dev/?utm_source=learnconvexdemoapp"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-convex-red transition-colors">
                Powered by Convex
              </a>
              <a
                href="https://docs.convex.dev?utm_source=learnconvexdemoapp"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-convex-red transition-colors">
                Docs
              </a>
              <a
                href="https://github.com/waynesutton/learnconvex"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-convex-red transition-colors">
                Repo
              </a>
              <a href="/stats" className="hover:text-convex-red transition-colors">
                Stats
              </a>
            </div>
            <a
              href="https://chef.convex.dev/?utm_source=learnconvexdemoapp"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-convex-red transition-colors">
              Cooked on Chef by Convex
            </a>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-convex-cream flex flex-col">
      {/* Header */}
      <header className="bg-convex-cream px-4 py-2 pt-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {showInitialQuestions ? (
            <div className="flex-1 flex justify-center">
              <a
                href="https://convex.dev?utm_source=learnconvexdemoapp"
                target="_blank"
                rel="noopener noreferrer">
                <img src="/convex-black.svg" alt="Convex" className="h-4" />
              </a>
            </div>
          ) : (
            <>
              <div>
                <a
                  href="https://convex.dev?utm_source=learnconvexdemoapp"
                  target="_blank"
                  rel="noopener noreferrer">
                  <img src="/convex-black.svg" alt="Convex" className="h-4" />
                </a>
                {/* <p className="text-sm text-gray-600">The backend for AI</p> */}
              </div>
              <button
                onClick={resetCourse}
                className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                style={{ borderRadius: "30px" }}>
                Start Over
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Cards Mode */}
        {showCardsMode ? (
          <div className="flex-1 overflow-y-auto p-4">
            <DuolingoCards sessionId={sessionId} />
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {showInitialQuestions ? (
                <div className="space-y-6 -mt-2">
                  <div className="bg-convex-cream rounded-lg p-4 sm:p-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 text-center">
                      Welcome to Learn Convex!
                    </h2>
                    <p className="text-gray-700 mb-6 sm:mb-8 text-center text-base sm:text-lg leading-relaxed">
                      Choose your learning mode to get started.
                    </p>

                    <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8">
                      {/* Chat Mode */}
                      <div className="w-full md:w-72 p-6 md:p-8 bg-white border border-[#EEEEEE] rounded-lg flex flex-col items-center justify-center text-center">
                        <div className="font-bold text-lg md:text-xl mb-3 text-gray-900">
                          Chat Mode
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed mb-6">
                          Interactive chat-based learning
                        </div>
                        <div className="space-y-3 w-full">
                          <button
                            onClick={() => handleCourseSelection("build-apps", true)}
                            className="w-full from-33% group z-10 inline-flex rounded-full bg-gradient-to-br from-plum-p4 via-red-r3 via-90% to-yellow-y3 to-100% p-0.5 shadow-[0_2px_14px_rgba(111,0,255,0.25)] transition-shadow hover:shadow-[rgba(111,0,255,0.5)]">
                            <span className="w-full px-4 md:px-6 py-3 bg-black text-white rounded-full ring-2 ring-[#B72C57] text-sm md:text-base">
                              Start Course
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="w-full md:w-72 p-6 md:p-8 bg-white border border-[#EEEEEE] rounded-lg flex flex-col items-center justify-center text-center">
                        <div className="font-bold text-lg md:text-xl mb-3 text-gray-900">
                          Cards Mode
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed mb-6">
                          Flashcard Q&A learning
                        </div>
                        <button
                          onClick={() => handleCourseSelection("build-apps-cards")}
                          className="from-33% group z-10 inline-flex rounded-full bg-gradient-to-br from-plum-p4 via-red-r3 via-90% to-yellow-y3 to-100% p-0.5 shadow-[0_2px_14px_rgba(111,0,255,0.25)] transition-shadow hover:shadow-[rgba(111,0,255,0.5)]">
                          <span className="px-4 md:px-6 py-3 bg-black text-white rounded-full ring-2 ring-[#B72C57] text-sm md:text-base">
                            Start Cards
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* The backend for AI section */}
                    <div className="mt-8 sm:mt-8 pt-8 sm:pt-8 border-t border-[#EEEEEE] text-center">
                      <h2 className="text-2xl sm:text-normal font-bold text-gray-900 mb-4">
                        The backend for AI
                      </h2>
                      <p className="text-gray-700 sm:text-md text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
                        Convex is the open-source reactive database for app developers.
                      </p>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
                        <a
                          href="https://convex.dev/?utm_source=learnconvexdemoapp"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="from-33% group z-10 inline-flex rounded-full bg-gradient-to-br from-plum-p4 via-red-r3 via-90% to-yellow-y3 to-100% p-0.5 shadow-[0_2px_14px_rgba(111,0,255,0.25)] transition-shadow hover:shadow-[rgba(111,0,255,0.5)]">
                          <span className="px-4 md:px-6 py-3 bg-black text-white rounded-full ring-2 ring-[#B72C57] text-sm md:text-base">
                            Start building
                          </span>
                        </a>

                        <span className="text-gray-500 text-sm">or</span>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white border border-[#EEEEEE] rounded-lg px-3 py-2">
                            <img src="/right.svg" alt=">" className="h-4 w-auto mr-2" />
                            <span className="text-sm font-mono">
                              <span className="text-black">npm</span>{" "}
                              <span className="text-red-600">create convex</span>
                            </span>
                            <button
                              onClick={() => copyToClipboard("npm create convex")}
                              className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Copy to clipboard">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-gray-500">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                          </div>

                          <a
                            href="https://chef.convex.dev?utm_source=learnconvexdemoapp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-white hover:opacity-90 transition-opacity text-sm flex items-center gap-2"
                            style={{ backgroundColor: "#38383A", borderRadius: "20px" }}>
                            Try Convex with
                            <img src="/chef.svg" alt="Chef" className="h-6 w-auto" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {session?.messages?.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-3xl rounded-lg px-4 py-3 relative group ${
                          message.role === "user"
                            ? "bg-convex-red text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}>
                        {message.role === "user" ? (
                          <div className="flex items-start justify-between">
                            <div className="whitespace-pre-wrap flex-1">{message.content}</div>
                            {message.isVoiceMessage && (
                              <div className="ml-2 text-white/70">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 2C13.1 2 14 2.9 14 4V12C14 13.1 13.1 14 12 14C10.9 14 10 13.1 10 12V4C10 2.9 10.9 2 12 2M19 10V12C19 15.9 15.9 19 12 19S5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17S17 14.8 17 12V10H19Z" />
                                </svg>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <MessageRenderer content={message.content} />
                            </div>
                            <button
                              onClick={() => handleTextToSpeech(message.content, index)}
                              className="ml-3 mt-1 p-2 hover:bg-gray-100 rounded-full flex-shrink-0 transition-colors"
                              title={
                                isPlaying && currentlyPlayingMessageId === `message-${index}`
                                  ? "Stop audio"
                                  : "Read aloud"
                              }
                              disabled={
                                isPlaying && currentlyPlayingMessageId !== `message-${index}`
                              }>
                              {isPlaying && currentlyPlayingMessageId === `message-${index}` ? (
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  className="text-convex-red">
                                  <rect x="6" y="4" width="4" height="16" rx="1" />
                                  <rect x="14" y="4" width="4" height="16" rx="1" />
                                </svg>
                              ) : (
                                <svg
                                  width="18"
                                  height="18"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="text-gray-500 hover:text-convex-red">
                                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <img
                            src="/favicon-32x32.png"
                            alt="Convex"
                            className="animate-spin h-4 w-4"
                          />
                          <span className="text-gray-600">
                            {useAgentFlow ? "AgentFlow thinking..." : "Thinking..."}
                          </span>
                          {useAgentFlow && <span className="text-purple-600">✨</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!showInitialQuestions && (
              <div className="bg-convex-cream p-4">
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        isListening
                          ? "Listening..."
                          : "Type your response... (Type 'end' to complete the course or use voice)"
                      }
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-black resize-none text-sm sm:text-base"
                      rows={1}
                      disabled={isLoading || isListening}
                    />
                    {/* Voice Input Button */}
                    <button
                      onClick={isListening ? stopListening : startListening}
                      disabled={isLoading}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors ${
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                      }`}
                      title={isListening ? "Stop listening" : "Start voice input"}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C13.1 2 14 2.9 14 4V12C14 13.1 13.1 14 12 14C10.9 14 10 13.1 10 12V4C10 2.9 10.9 2 12 2M19 10V12C19 15.9 15.9 19 12 19S5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17S17 14.8 17 12V10H19Z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex space-x-3 sm:space-x-3">
                    <button
                      onClick={() => handleSkipQuestion()}
                      disabled={isLoading}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                      style={{ borderRadius: "30px" }}>
                      Skip
                    </button>
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={(!userMessage.trim() && !isListening) || isLoading}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                      style={{ borderRadius: "30px" }}>
                      Send
                    </button>
                  </div>
                </div>

                {/* Voice Status */}
                {isListening && (
                  <div className="mt-2 text-center">
                    <div className="inline-flex items-center space-x-2 text-sm text-red-600">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span>Listening... Say "end" or "skip" for voice commands</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Score Display */}
      {session && !showInitialQuestions && !showCardsMode && (
        <div className="bg-convex-cream px-4 py-2">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
            <div className="text-center sm:text-left flex items-center space-x-2">
              <button
                onClick={handleEndCourse}
                disabled={session.isCompleted}
                className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="End Course">
                End Course
              </button>
              <span>
                Course:{" "}
                {session.courseType === "build-apps"
                  ? "Build Apps (Chat Mode)"
                  : "Build Apps (Cards Mode)"}
              </span>
              {useAgentFlow && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  ✨ AgentFlow
                </span>
              )}
            </div>
            <div className="text-center sm:text-right">
              Progress: {session.currentQuestion}/
              {courseSettings?.totalQuestions || session?.totalQuestions || 10} | Score:{" "}
              {session.score}/{session.courseType ? courseSettings?.maxScore || 100 : 100}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-convex-cream px-4 py-2">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-500 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <a
              href="https://convex.dev/?utm_source=learnconvexdemoapp"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-convex-red transition-colors">
              Powered by Convex
            </a>
            <a
              href="https://docs.convex.dev?utm_source=learnconvexdemoapp"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-convex-red transition-colors">
              Docs
            </a>
            <a
              href="https://github.com/waynesutton/learnconvex"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-convex-red transition-colors">
              Repo
            </a>
            <a href="/stats" className="hover:text-convex-red transition-colors">
              Stats
            </a>
          </div>
          <a
            href="https://chef.convex.dev/?utm_source=learnconvexdemoapp"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-convex-red transition-colors">
            Cooked on Chef by Convex
          </a>
        </div>
      </footer>

      {/* Celebration Badge */}
      {showBadge && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 sm:px-8 py-3 sm:py-4 rounded-full text-lg sm:text-2xl font-bold shadow-2xl animate-bounce">
            {showBadge}
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
