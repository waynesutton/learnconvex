import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import confetti from "canvas-confetti";
import { MessageRenderer } from "./MessageRenderer";

interface DuolingoCardsProps {
  sessionId: string;
  difficulty?: string; // Made optional since we're removing difficulty selection
}

export function DuolingoCards({ sessionId, difficulty = "default" }: DuolingoCardsProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [currentUserAnswer, setCurrentUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [cardQuestions, setCardQuestions] = useState<
    Array<{
      question: string;
      answer: string;
      explanation: string;
    }>
  >([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const session = useQuery(api.course.getSession, { sessionId }) || null;
  const courseSettings = useQuery(
    api.course.getCourseSettings,
    session?.courseType
      ? {
          courseType: session.courseType,
          difficulty: session.difficulty || difficulty || "default",
        }
      : "skip"
  );
  const randomizedQuestions = useQuery(api.course.getRandomizedQuestions, { sessionId });
  const updateSession = useMutation(api.course.updateSession);
  const addMessage = useMutation(api.course.addMessage);
  const endCourse = useMutation(api.course.endCourse);

  useEffect(() => {
    if (randomizedQuestions && randomizedQuestions.length > 0 && courseSettings) {
      // Use courseSettings.totalQuestions to limit the number of cards
      const dynamicTotalQuestions = courseSettings.totalQuestions || 10;

      // Slice the randomized questions to match the current course settings
      const limitedQuestions = randomizedQuestions.slice(0, dynamicTotalQuestions);
      setCardQuestions(limitedQuestions);

      // Update session if total questions doesn't match current settings
      if (session && session.totalQuestions !== dynamicTotalQuestions) {
        updateSession({
          sessionId,
          totalQuestions: dynamicTotalQuestions,
        });
      }
    } else if (randomizedQuestions && randomizedQuestions.length > 0) {
      // Fallback if courseSettings not loaded yet
      setCardQuestions(randomizedQuestions);
    }
  }, [session, randomizedQuestions, courseSettings, sessionId, updateSession]);

  // Check for admin hints in messages for current card
  const currentCardHints =
    session?.messages.filter((msg) => {
      if (!msg.isAdminIntervention) return false;

      const content = msg.content.toLowerCase();
      const currentCard = `card ${currentCardIndex + 1}`;

      // Check if hint is specifically for current card or general hint
      return (
        content.includes(currentCard) ||
        (content.includes("hint") && !content.includes("card ")) ||
        content.includes("help")
      );
    }) || [];

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const checkAnswer = async () => {
    if (!cardQuestions[currentCardIndex]) return;

    // Check if user typed "end" to complete the course
    if (currentUserAnswer.toLowerCase().trim() === "end") {
      await addMessage({
        sessionId,
        role: "user",
        content: `Completed cards early with "end" command on Card ${currentCardIndex + 1}`,
      });

      updateSession({
        sessionId,
        // Keep currentQuestion at actual card progress when ended early
        currentQuestion: currentCardIndex + 1,
        totalQuestions: cardQuestions.length,
        isCompleted: true,
      });
      return;
    }

    const correct =
      currentUserAnswer.toLowerCase().trim() ===
      cardQuestions[currentCardIndex].answer.toLowerCase().trim();
    setIsCorrect(correct);
    setShowAnswer(true);

    // Log user's answer
    await addMessage({
      sessionId,
      role: "user",
      content: `Card ${currentCardIndex + 1}: "${cardQuestions[currentCardIndex].question}" - Answer: "${currentUserAnswer}"`,
    });

    // Log the result
    await addMessage({
      sessionId,
      role: "assistant",
      content: `${correct ? "✅ Correct!" : "❌ Incorrect"} Expected: "${cardQuestions[currentCardIndex].answer}". ${cardQuestions[currentCardIndex].explanation}`,
    });

    // Award points for any attempt - full points for correct, partial for incorrect
    const maxScore = courseSettings?.maxScore || 100;
    const totalQuestions = courseSettings?.totalQuestions || cardQuestions.length;
    const pointsPerQuestion = Math.floor(maxScore / totalQuestions);
    const scoreToAdd = correct ? pointsPerQuestion : Math.floor(pointsPerQuestion * 0.5); // Half points for trying

    updateSession({
      sessionId,
      currentQuestion: currentCardIndex + 1,
      score: Math.min((session?.score || 0) + scoreToAdd, maxScore),
      lastActionWasSkip: false,
    });

    if (correct) {
      triggerConfetti();
    }
  };

  const nextCard = async () => {
    if (currentCardIndex < cardQuestions.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setCurrentUserAnswer("");
      setShowAnswer(false);
      setIsCorrect(null);
    } else {
      // Course completed - use dynamic settings
      const dynamicTotalQuestions = courseSettings?.totalQuestions || cardQuestions.length;
      const dynamicMaxScore = courseSettings?.maxScore || 100;

      await addMessage({
        sessionId,
        role: "assistant",
        content: `🎉 Congratulations! You've completed all ${dynamicTotalQuestions} cards with a score of ${session?.score || 0}/${dynamicMaxScore}!`,
      });

      updateSession({
        sessionId,
        currentQuestion: cardQuestions.length, // Use actual cards completed, not dynamic total
        totalQuestions: dynamicTotalQuestions,
        isCompleted: true,
      });
    }
  };

  const skipCard = async () => {
    // Log the skip
    await addMessage({
      sessionId,
      role: "user",
      content: `Card ${currentCardIndex + 1}: Skipped - "${cardQuestions[currentCardIndex].question}"`,
    });

    // Update progress without adding score points and mark as skip
    updateSession({
      sessionId,
      currentQuestion: currentCardIndex + 1,
      lastActionWasSkip: true,
    });

    if (currentCardIndex < cardQuestions.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setCurrentUserAnswer("");
      setShowAnswer(false);
      setIsCorrect(null);
    } else {
      // Course completed - use dynamic settings
      const dynamicTotalQuestions = courseSettings?.totalQuestions || cardQuestions.length;
      const dynamicMaxScore = courseSettings?.maxScore || 100;

      await addMessage({
        sessionId,
        role: "assistant",
        content: `Course completed! Final score: ${session?.score || 0}/${dynamicMaxScore}`,
      });

      updateSession({
        sessionId,
        currentQuestion: cardQuestions.length, // Use actual cards completed, not dynamic total
        totalQuestions: dynamicTotalQuestions,
        isCompleted: true,
      });
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setCurrentUserAnswer("");
      setShowAnswer(false);
      setIsCorrect(null);
    }
  };

  const handleEndCourse = async () => {
    try {
      await endCourse({
        sessionId,
      });
      // The component will re-render when the session isCompleted state changes
    } catch (error) {
      console.error("Error ending course:", error);
    }
  };

  if (!cardQuestions.length) {
    // Show more detailed loading information
    if (!session) {
      return <div className="text-center">Loading session...</div>;
    }
    if (!session.courseType) {
      return <div className="text-center">Loading course type...</div>;
    }
    if (!session.randomizedQuestionOrder) {
      return <div className="text-center">Loading question order...</div>;
    }
    if (!randomizedQuestions) {
      return <div className="text-center">Loading questions...</div>;
    }
    if (randomizedQuestions.length === 0) {
      return (
        <div className="text-center">
          <div>No questions found for course: {session.courseType}</div>
          <div className="text-sm text-gray-600 mt-2">
            Session ID: {sessionId}
            <br />
            Difficulty: {session.difficulty || difficulty}
            <br />
            Question Order Length: {session.randomizedQuestionOrder?.length || 0}
          </div>
        </div>
      );
    }
    return <div className="text-center">Loading cards...</div>;
  }

  const currentCard = cardQuestions[currentCardIndex];
  const dynamicTotalQuestions = courseSettings?.totalQuestions || cardQuestions.length;
  const progress = ((currentCardIndex + 1) / dynamicTotalQuestions) * 100;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 h-full flex flex-col">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6 sm:mb-8">
        <div
          className="bg-gradient-to-r from-amber-50 to-amber-400 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card Stack Container */}
      <div className="relative flex-1 flex items-start justify-center">
        <div
          className={`w-full transition-all duration-300 ${
            currentCardHints.length > 0 ? "min-h-[500px]" : "min-h-[450px]"
          }`}
          style={{
            height: currentCardHints.length > 0 ? "auto" : "450px",
          }}>
          {cardQuestions.map((card, index) => {
            const isActive = index === currentCardIndex;
            const isPast = index < currentCardIndex;
            const isFuture = index > currentCardIndex;

            // Calculate position and styling for card stack effect
            const zIndex = cardQuestions.length - Math.abs(index - currentCardIndex);
            const scale = isActive ? 1 : isFuture ? 0.95 - (index - currentCardIndex) * 0.02 : 0.9;
            const translateY = isActive ? 0 : isFuture ? (index - currentCardIndex) * 8 : -20;
            const opacity = isActive ? 1 : isFuture ? 0.7 - (index - currentCardIndex) * 0.1 : 0.3;
            const rotateZ = isFuture ? (index - currentCardIndex) * 2 : 0;

            return (
              <div
                key={index}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className={`absolute top-0 left-0 right-0 bg-white rounded-2xl shadow-xl transition-all duration-300 ease-out ${
                  isActive ? "cursor-default" : "cursor-pointer"
                }`}
                style={{
                  zIndex,
                  transform: `
                    translateY(${translateY}px) 
                    scale(${scale}) 
                    rotate(${rotateZ}deg)
                  `,
                  opacity,
                  pointerEvents: isActive ? "auto" : "none",
                  minHeight: isActive && currentCardHints.length > 0 ? "auto" : "450px",
                  height: isActive ? "auto" : "450px",
                }}>
                <div className="p-6 sm:p-8 h-full flex flex-col justify-between">
                  <div className="flex-1">
                    <div className="text-center mb-6 sm:mb-8">
                      <div className="text-gray-500 text-xs sm:text-sm mb-2">
                        Question {index + 1} of {dynamicTotalQuestions}
                      </div>
                      <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                        {card.question}
                      </h2>
                    </div>

                    {isActive && (
                      <>
                        {/* Admin Hints Display */}
                        {currentCardHints.length > 0 && (
                          <div className="mb-6 space-y-3">
                            {currentCardHints.map((hint, hintIndex) => (
                              <div
                                key={hintIndex}
                                className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                                <div className="flex items-center mb-2">
                                  <span className="text-blue-600 text-xs font-medium uppercase tracking-wide">
                                    💡 ADMIN HINT
                                  </span>
                                  {hint.adminNote && (
                                    <span className="text-blue-500 text-xs ml-2 italic">
                                      ({hint.adminNote})
                                    </span>
                                  )}
                                </div>
                                <p className="text-blue-800 text-sm leading-relaxed">
                                  {hint.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {!showAnswer ? (
                          <div className="space-y-4 sm:space-y-6">
                            <input
                              type="text"
                              value={currentUserAnswer}
                              onChange={(e) => setCurrentUserAnswer(e.target.value)}
                              placeholder="Type your answer..."
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none text-base sm:text-lg"
                              onKeyPress={(e) => e.key === "Enter" && !showAnswer && checkAnswer()}
                              autoFocus
                            />
                            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                              <button
                                onClick={checkAnswer}
                                disabled={!currentUserAnswer.trim()}
                                className="flex-1 py-3 bg-gray-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors text-sm sm:text-base"
                                style={{ borderRadius: "30px" }}>
                                Check Answer
                              </button>
                              <button
                                onClick={skipCard}
                                className="px-4 sm:px-6 py-3 bg-gray-300 text-gray-700 font-semibold hover:bg-gray-400 transition-colors text-sm sm:text-base"
                                style={{ borderRadius: "30px" }}>
                                Skip
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 sm:space-y-6">
                            <div
                              className={`p-3 sm:p-4 rounded-lg ${
                                isCorrect
                                  ? "bg-green-100 border-green-500"
                                  : "bg-red-100 border-red-500"
                              } border-2`}>
                              <div className="flex items-center mb-2">
                                <span
                                  className={`text-base sm:text-lg font-bold ${
                                    isCorrect ? "text-green-700" : "text-red-700"
                                  }`}>
                                  {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
                                </span>
                              </div>
                              <div className="text-gray-700 text-sm sm:text-base">
                                <strong>Answer:</strong> {card.answer}
                              </div>
                              <div className="text-gray-600 mt-2 text-sm sm:text-base">
                                {card.explanation}
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                              {currentCardIndex > 0 && (
                                <button
                                  onClick={previousCard}
                                  className="flex-1 py-3 bg-gray-300 text-gray-700 font-semibold hover:bg-gray-400 transition-colors text-sm sm:text-base"
                                  style={{ borderRadius: "30px" }}>
                                  Previous
                                </button>
                              )}
                              <button
                                onClick={nextCard}
                                className="flex-1 py-3 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors text-sm sm:text-base"
                                style={{ borderRadius: "30px" }}>
                                {currentCardIndex < cardQuestions.length - 1 ? "Next" : "Complete"}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card Stack Indicators */}
      <div className="flex justify-center space-x-2 mt-6">
        {cardQuestions.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index <= currentCardIndex || showAnswer) {
                setCurrentCardIndex(index);
                setCurrentUserAnswer("");
                setShowAnswer(false);
                setIsCorrect(null);
              }
            }}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentCardIndex
                ? "bg-gradient-to-r from-orange-600 to-orange-500 w-8"
                : index < currentCardIndex
                  ? "bg-green-500"
                  : "bg-gray-300"
            } ${index <= currentCardIndex || showAnswer ? "cursor-pointer" : "cursor-not-allowed"}`}
          />
        ))}
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-center space-x-4 mt-4 sm:mt-6 text-gray-600 text-sm sm:text-base">
        <span>
          Score: {session?.score || 0}/{courseSettings?.maxScore || 100}
        </span>
        <button
          onClick={handleEndCourse}
          disabled={session?.isCompleted}
          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="End Course">
          End Course
        </button>
      </div>
    </div>
  );
}
