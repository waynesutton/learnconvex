import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import confetti from "canvas-confetti";

interface CardsProps {
  sessionId: string;
}

export function Cards({ sessionId }: CardsProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
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

  const session = useQuery(api.course.getSession, { sessionId });
  const randomizedQuestions = useQuery(api.course.getRandomizedQuestions, { sessionId });
  const updateSession = useMutation(api.course.updateSession);

  useEffect(() => {
    if (randomizedQuestions && randomizedQuestions.length > 0) {
      setCardQuestions(randomizedQuestions);
    }

    // Initialize session with correct total questions for cards mode
    if (session && !session.totalQuestions && randomizedQuestions) {
      updateSession({
        sessionId,
        totalQuestions: randomizedQuestions.length,
      });
    }
  }, [session, randomizedQuestions, sessionId, updateSession]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const checkAnswer = () => {
    if (!cardQuestions[currentCardIndex]) return;

    // Check if user typed "end" to complete the course
    if (userAnswer.toLowerCase().trim() === "end") {
      updateSession({
        sessionId,
        currentQuestion: cardQuestions.length,
        totalQuestions: cardQuestions.length,
        isCompleted: true,
      });
      return;
    }

    const correct =
      userAnswer.toLowerCase().trim() ===
      cardQuestions[currentCardIndex].answer.toLowerCase().trim();
    setIsCorrect(correct);
    setShowAnswer(true);

    if (correct) {
      triggerConfetti();
      // Update score and mark as not a skip
      updateSession({
        sessionId,
        currentQuestion: currentCardIndex + 1,
        score: Math.min((session?.score || 0) + Math.floor(100 / cardQuestions.length), 100),
        lastActionWasSkip: false,
      });
    }
  };

  const nextCard = () => {
    if (currentCardIndex < cardQuestions.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setUserAnswer("");
      setShowAnswer(false);
      setIsCorrect(null);
    } else {
      // Course completed
      updateSession({
        sessionId,
        currentQuestion: cardQuestions.length,
        totalQuestions: cardQuestions.length,
        isCompleted: true,
      });
    }
  };

  const skipCard = () => {
    // Update progress without adding score points and mark as skip
    updateSession({
      sessionId,
      currentQuestion: currentCardIndex + 1,
      lastActionWasSkip: true,
    });

    if (currentCardIndex < cardQuestions.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setUserAnswer("");
      setShowAnswer(false);
      setIsCorrect(null);
    } else {
      // Course completed
      updateSession({
        sessionId,
        currentQuestion: cardQuestions.length,
        totalQuestions: cardQuestions.length,
        isCompleted: true,
      });
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setUserAnswer("");
      setShowAnswer(false);
      setIsCorrect(null);
    }
  };

  if (!cardQuestions.length) {
    return <div className="text-center">Loading cards...</div>;
  }

  const currentCard = cardQuestions[currentCardIndex];
  const progress = ((currentCardIndex + 1) / cardQuestions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 h-full flex flex-col">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6 sm:mb-8">
        <div
          className="bg-gradient-to-r from-green-50 to-green-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Card Stack Container */}
      <div className="relative flex-1 flex items-center justify-center min-h-[450px]">
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
              className={`absolute inset-0 bg-white rounded-2xl shadow-xl transition-all duration-300 ease-out ${
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
              }}>
              <div className="p-6 sm:p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="text-center mb-6 sm:mb-8">
                    <div className="text-gray-500 text-xs sm:text-sm mb-2">
                      Question {index + 1} of {cardQuestions.length}
                    </div>
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
                      {card.question}
                    </h2>
                  </div>

                  {isActive && (
                    <>
                      {!showAnswer ? (
                        <div className="space-y-4 sm:space-y-6">
                          <input
                            type="text"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="Type your answer..."
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none text-base sm:text-lg"
                            onKeyPress={(e) => e.key === "Enter" && !showAnswer && checkAnswer()}
                            autoFocus
                          />
                          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                            <button
                              onClick={checkAnswer}
                              disabled={!userAnswer.trim()}
                              className="flex-1 py-3 bg-black text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors text-sm sm:text-base">
                              Check Answer
                            </button>
                            <button
                              onClick={skipCard}
                              className="px-4 sm:px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-colors text-sm sm:text-base">
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
                                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base">
                                Previous
                              </button>
                            )}
                            <button
                              onClick={nextCard}
                              className="flex-1 py-3 bg-gradient-to-r from-slate-950 to-gray-900 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-600 transition-colors text-sm sm:text-base">
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

      {/* Card Stack Indicators */}
      <div className="flex justify-center space-x-2 mt-6">
        {cardQuestions.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              if (index <= currentCardIndex || showAnswer) {
                setCurrentCardIndex(index);
                setUserAnswer("");
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
      <div className="text-center mt-4 sm:mt-6 text-gray-600 text-sm sm:text-base">
        Score: {session?.score || 0}/100
      </div>
    </div>
  );
}
