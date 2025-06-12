import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster } from "sonner";
import { MessageRenderer } from "./components/MessageRenderer";
import { Cards } from "./components/DuolingoCards";
import confetti from "canvas-confetti";

// Course settings for dynamic scoring
const COURSE_SETTINGS = {
  "how-convex-works": {
    totalQuestions: 10,
    maxScore: 100,
  },
  "build-apps": {
    totalQuestions: 7,
    maxScore: 100,
  },
  "build-apps-cards": {
    totalQuestions: 7,
    maxScore: 100,
  },
};

export default function App() {
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showInitialQuestions, setShowInitialQuestions] = useState(true);
  const [showCompletionPage, setShowCompletionPage] = useState(false);
  const [showCardsMode, setShowCardsMode] = useState(false);
  const [celebrationBadges, setCelebrationBadges] = useState<string[]>([]);
  const [showBadge, setShowBadge] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousQuestionRef = useRef<number>(0);
  const badgeCountRef = useRef<number>(0);

  const session = useQuery(api.course.getSession, { sessionId });
  const createSession = useMutation(api.course.createSession);
  const addMessage = useMutation(api.course.addMessage);
  const updateSession = useMutation(api.course.updateSession);
  const generateResponse = useAction(api.course.generateResponse);

  // Don't create session immediately - only create when user actually starts a course

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages]);

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

  const handleCourseSelection = async (courseType: string) => {
    setShowInitialQuestions(false);

    // Create session only when user actually selects a course
    await createSession({ sessionId, courseType });

    // Check if it's the cards mode
    if (courseType === "build-apps-cards") {
      setShowCardsMode(true);
      return;
    }

    const welcomeMessage =
      courseType === "how-convex-works"
        ? "Great choice! Let's start by understanding how Convex works.\n\nConvex is a reactive backend that automatically keeps your frontend in sync with your database. When data changes on the server, your React components automatically re-render with the latest data - no manual refreshing needed!\n\nHere's a simple example of how this works:\n\n```javascript\n// In your React component\nconst messages = useQuery(api.messages.list);\n// This automatically updates when messages change!\n```\n\nLet's start with a question: What do you think 'reactive' means in the context of a backend database? Take your best guess!"
        : "Excellent choice! Let's learn how to build apps with Convex.\n\nWe'll start with the basics and work our way up to building real applications. Convex makes it incredibly easy to go from idea to deployed app.\n\nHere's how you start a new Convex project:\n\n```bash\nnpx create-convex@latest my-app\ncd my-app\nnpm run dev\n```\n\nFirst question: When starting a new Convex project, what's the very first command you would run? (Hint: it involves npm or npx)";

    await addMessage({
      sessionId,
      role: "assistant",
      content: welcomeMessage,
    });
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    // Check for special "end" command
    if (currentMessage.trim().toLowerCase() === "end") {
      setShowCompletionPage(true);
      await updateSession({
        sessionId,
        isCompleted: true,
        currentQuestion: session?.currentQuestion || 0,
        totalQuestions: session?.totalQuestions || 15,
      });
      return;
    }

    setIsLoading(true);
    try {
      await generateResponse({
        sessionId,
        userMessage: currentMessage,
      });
      setCurrentMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
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

  const handleSkipQuestion = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await generateResponse({
        sessionId,
        userMessage: "skip",
      });
    } catch (error) {
      console.error("Error skipping question:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Show celebration badge
  const showCelebrationBadge = (message: string) => {
    setShowBadge(message);
    setTimeout(() => setShowBadge(null), 2000);
  };

  const resetCourse = async () => {
    setShowInitialQuestions(true);
    setShowCompletionPage(false);
    setShowCardsMode(false);
    badgeCountRef.current = 0;
    previousQuestionRef.current = 0;
    await updateSession({
      sessionId,
      currentQuestion: 0,
      score: 0,
      isCompleted: false,
    });
    // Clear messages by creating a new session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await createSession({ sessionId: newSessionId });
    window.location.reload();
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

  if (session === undefined) {
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
              {session?.courseType === "how-convex-works"
                ? "How Convex Works"
                : session?.courseType === "build-apps-cards"
                  ? "Building Apps with Convex (Cards)"
                  : "Building Apps with Convex"}{" "}
              course.
            </p>
            <div className="bg-convex-cream rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Final Score: {session?.score || 0}/
                {session?.courseType
                  ? COURSE_SETTINGS[session.courseType as keyof typeof COURSE_SETTINGS]?.maxScore ||
                    100
                  : 100}
              </div>
              <div className="text-sm sm:text-base text-gray-600">
                Questions Completed: {session?.currentQuestion || 0}/{session?.totalQuestions || 10}
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
            <Cards sessionId={sessionId} />
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
                      Choose your learning mode to get started with Convex, the backend for AI.
                    </p>

                    <div className="flex flex-col md:flex-row justify-center gap-4 md:gap-8">
                      {/* <div className="w-full md:w-72 p-6 md:p-8 bg-white rounded-lg flex flex-col items-center justify-center text-center">
                    <div className="font-bold text-lg md:text-xl mb-3 text-gray-900">
                      Learn how Convex works
                    </div>
                    <div className="text-sm text-gray-600 leading-relaxed mb-6">
                      Understand the core concepts and architecture
                    </div>
                    <button
                      onClick={() => handleCourseSelection("how-convex-works")}
                      className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                      style={{ borderRadius: "30px" }}>
                      Start Course
                    </button>
                  </div> */}

                      <div className="w-full md:w-72 p-6 md:p-8 bg-white border border-[#EEEEEE] rounded-lg flex flex-col items-center justify-center text-center">
                        <div className="font-bold text-lg md:text-xl mb-3 text-gray-900">
                          Chat Mode
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed mb-6">
                          Interactive chat-based learning
                        </div>
                        <button
                          onClick={() => handleCourseSelection("build-apps")}
                          className="from-33% group z-10 inline-flex rounded-full bg-gradient-to-br from-plum-p4 via-red-r3 via-90% to-yellow-y3 to-100% p-0.5 shadow-[0_2px_14px_rgba(111,0,255,0.25)] transition-shadow hover:shadow-[rgba(111,0,255,0.5)]">
                          <span className="px-4 md:px-6 py-3 bg-black text-white rounded-full ring-2 ring-[#B72C57] text-sm md:text-base">
                            Start Course
                          </span>
                        </button>
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
                        className={`max-w-3xl rounded-lg px-4 py-3 ${
                          message.role === "user"
                            ? "bg-convex-red text-white"
                            : "bg-white text-gray-900 border border-gray-200"
                        }`}>
                        {message.role === "user" ? (
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        ) : (
                          <MessageRenderer content={message.content} />
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
                          <span className="text-gray-600">Thinking...</span>
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
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your response... (Type 'end' to complete the course)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black resize-none text-sm sm:text-base"
                      rows={1}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex space-x-3 sm:space-x-3">
                    <button
                      onClick={handleSkipQuestion}
                      disabled={isLoading}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-3 bg-gray-300 text-gray-700 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                      style={{ borderRadius: "30px" }}>
                      Skip
                    </button>
                    <button
                      onClick={handleSendMessage}
                      disabled={!currentMessage.trim() || isLoading}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                      style={{ borderRadius: "30px" }}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Score Display */}
      {session && !showInitialQuestions && !showCardsMode && (
        <div className="bg-convex-cream px-4 py-2">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
            <div className="text-center sm:text-left">
              Course:{" "}
              {session.courseType === "how-convex-works"
                ? "How Convex Works"
                : session.courseType === "build-apps-cards"
                  ? "Building Apps (Cards)"
                  : "Building Apps"}
            </div>
            <div className="text-center sm:text-right">
              Progress: {session.currentQuestion}/{session.totalQuestions || 10} | Score:{" "}
              {session.score}/
              {session.courseType
                ? COURSE_SETTINGS[session.courseType as keyof typeof COURSE_SETTINGS]?.maxScore ||
                  100
                : 100}
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
