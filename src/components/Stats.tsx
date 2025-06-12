import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Stats() {
  const overallStats = useQuery(api.stats.getOverallStats);
  const recentActivity = useQuery(api.stats.getRecentActivity);
  const scoreDistribution = useQuery(api.stats.getScoreDistribution);

  if (!overallStats || !recentActivity || !scoreDistribution) {
    return (
      <div className="min-h-screen bg-convex-cream flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <span className="text-gray-600">Loading stats...</span>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCourseDisplayName = (courseType?: string) => {
    switch (courseType) {
      case "build-apps":
        return "Chat Mode";
      case "build-apps-cards":
        return "Cards Mode";
      case "how-convex-works":
        return "How Convex Works";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-convex-cream flex flex-col">
      {/* Header */}
      <header className="bg-convex-cream px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center">
              <img src="/convex-black.svg" alt="Convex" className="h-4" />
            </a>
            <span className="text-gray-400">|</span>
            <h1 className="text-xl font-bold text-gray-900">Learning Statistics</h1>
          </div>
          <a
            href="/"
            className="px-4 py-2 text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors"
            style={{ borderRadius: "30px" }}>
            Back to Courses
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-4 space-y-6">
        {/* Debug information removed - issues identified and fixed */}

        {/* Overview Stats Grid - Always show basic stats from real-time database */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {overallStats.totalSessionsCompleted}
            </div>
            <div className="text-sm text-gray-600">Courses Completed</div>
            <div className="text-xs text-convex-red mt-1">
              {overallStats.completionRate}% completion rate
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">{overallStats.averageScore}</div>
            <div className="text-sm text-gray-600">Average Score</div>
            <div className="text-xs text-gray-500 mt-1">out of 100 points</div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {overallStats.totalQuestionsAnswered}
            </div>
            <div className="text-sm text-gray-600">Questions Answered</div>
            <div className="text-xs text-gray-500 mt-1">
              {overallStats.totalSkippedQuestions} skipped
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {overallStats.totalSessionsStarted}
            </div>
            <div className="text-sm text-gray-600">Total Sessions</div>
            <div className="text-xs text-gray-500 mt-1">all time</div>
          </div>
        </div>

        {/* Empty State Message - Show when no data exists */}
        {overallStats.totalSessionsStarted === 0 && (
          <div className="bg-white rounded-lg p-8 border border-gray-200 text-center">
            <div className="text-gray-500 text-lg mb-2">No Learning Data Yet</div>
            <div className="text-gray-400 text-sm mb-4">
              Start taking courses to see detailed statistics and analytics here.
            </div>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-convex-red text-white hover:bg-convex-red-dark transition-colors rounded-lg">
              Start Learning
            </a>
          </div>
        )}

        {/* Answer Accuracy Stats - Only show if there's actual learning data */}
        {overallStats.totalQuestionsAnswered > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-xl font-bold text-green-600 mb-1">
                {overallStats.correctAnswersEstimate}
              </div>
              <div className="text-sm text-gray-600">Estimated Correct Answers</div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-xl font-bold text-red-600 mb-1">
                {overallStats.incorrectAnswersEstimate}
              </div>
              <div className="text-sm text-gray-600">Estimated Incorrect Answers</div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="text-xl font-bold text-yellow-600 mb-1">
                {overallStats.totalSkippedQuestions}
              </div>
              <div className="text-sm text-gray-600">Questions Skipped</div>
            </div>
          </div>
        )}

        {/* Course Mode Breakdown - Only show if there are completed courses */}
        {overallStats.totalSessionsCompleted > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Course Completions */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Courses by Mode</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Chat Mode</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-convex-red h-2 rounded-full"
                        style={{
                          width: `${overallStats.totalSessionsCompleted > 0 ? (overallStats.courseBreakdown.chatMode / overallStats.totalSessionsCompleted) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {overallStats.courseBreakdown.chatMode}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cards Mode</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-convex-purple h-2 rounded-full"
                        style={{
                          width: `${overallStats.totalSessionsCompleted > 0 ? (overallStats.courseBreakdown.cardsMode / overallStats.totalSessionsCompleted) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {overallStats.courseBreakdown.cardsMode}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">How Convex Works</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-convex-yellow h-2 rounded-full"
                        style={{
                          width: `${overallStats.totalSessionsCompleted > 0 ? (overallStats.courseBreakdown.howConvexWorks / overallStats.totalSessionsCompleted) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {overallStats.courseBreakdown.howConvexWorks}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Average Scores by Mode */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Average Scores by Mode</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Chat Mode</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-convex-red h-2 rounded-full"
                        style={{ width: `${overallStats.averageScoreByMode.chatMode}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {overallStats.averageScoreByMode.chatMode}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cards Mode</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-convex-purple h-2 rounded-full"
                        style={{ width: `${overallStats.averageScoreByMode.cardsMode}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {overallStats.averageScoreByMode.cardsMode}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">How Convex Works</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-convex-yellow h-2 rounded-full"
                        style={{ width: `${overallStats.averageScoreByMode.howConvexWorks}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {overallStats.averageScoreByMode.howConvexWorks}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score Distribution - Only show if there are completed courses with scores */}
        {overallStats.totalSessionsCompleted > 0 &&
          scoreDistribution.some((range) => range.count > 0) && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Score Distribution</h3>
              <div className="space-y-3">
                {scoreDistribution.map((range, index) => {
                  const maxCount = Math.max(...scoreDistribution.map((r) => r.count));
                  const percentage = maxCount > 0 ? (range.count / maxCount) * 100 : 0;

                  return (
                    <div key={range.scoreRange} className="flex justify-between items-center">
                      <span className="text-gray-600 w-16">{range.scoreRange}</span>
                      <div className="flex items-center space-x-2 flex-1 ml-4">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-gradient-to-r from-convex-red to-convex-purple h-4 rounded-full flex items-center justify-center"
                            style={{ width: `${percentage}%` }}>
                            {range.count > 0 && (
                              <span className="text-xs text-white font-semibold">
                                {range.count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Recent Learning Activity (last 20)
          </h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No learning activity yet. Start a course to see stats here!
              </div>
            ) : (
              recentActivity.map((session, index) => (
                <div
                  key={session._id}
                  className="flex items-center justify-between p-3 bg-convex-cream rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${session.isCompleted ? "bg-green-500" : "bg-yellow-500"}`}
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {getCourseDisplayName(session.courseType)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(session._creationTime)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{session.score}/100</div>
                    <div className="text-sm text-gray-600">
                      {session.currentQuestion}/{session.totalQuestions || 10} questions
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-convex-cream px-4 py-3 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-500 space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <a
              href="https://convex.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-convex-red transition-colors">
              Powered by Convex
            </a>
            <a
              href="https://docs.convex.dev"
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
          </div>
          <a
            href="https://chef.convex.dev/"
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
