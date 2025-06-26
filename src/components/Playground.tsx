import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { UserButton, useUser } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MessageRenderer } from "./MessageRenderer";
import { Modal } from "./Modal";
import { CourseSettingsPage } from "./CourseSettingsPage";
import { DocumentSearch } from "./DocumentSearch";
import { Stats } from "./Stats";

export function Playground() {
  // Check if Clerk is configured
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const { user } = useUser();

  const [currentView, setCurrentView] = useState<
    "playground" | "settings" | "document-search" | "stats"
  >("playground");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [targetContext, setTargetContext] = useState<string>("current");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showSessionDeleteModal, setShowSessionDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<"archive" | "delete" | "clear" | null>(null);
  const [settingsFormData, setSettingsFormData] = useState<{
    "build-apps": { totalQuestions: number; maxScore: number };
    "build-apps-cards": { totalQuestions: number; maxScore: number };
  }>({
    "build-apps": { totalQuestions: 10, maxScore: 100 },
    "build-apps-cards": { totalQuestions: 10, maxScore: 100 },
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user has admin role
  const isAdmin = isClerkConfigured ? user?.publicMetadata?.role === "admin" : true; // Allow access when Clerk not configured

  // Queries - only run if user is authenticated and has admin role
  const allSessions = useQuery(api.playground.getAllActiveSessions, { showArchived }) || [];
  const adminStats = useQuery(
    api.playground.getAdminStats,
    authIsLoading || !isAuthenticated || !isAdmin ? "skip" : {}
  );
  const courseSettings = useQuery(api.course.getAllCourseSettings) || [];
  const selectedSession = useQuery(
    api.playground.getSessionWithMessages,
    selectedSessionId ? { sessionId: selectedSessionId } : "skip"
  );
  const convexDocs = useQuery(api.course.getConvexDocs) || [];

  // Mutations
  const insertContextualMessage = useMutation(api.playground.insertContextualAdminMessage);
  const updateProgress = useMutation(api.playground.updateSessionProgress);
  const deleteMessage = useMutation(api.playground.deleteAdminMessage);
  const deleteAnyMessage = useMutation(api.playground.deleteAnyMessage);
  const editMessage = useMutation(api.playground.editMessage);
  const archiveSession = useMutation(api.playground.archiveSession);
  const deleteSession = useMutation(api.playground.deleteSession);
  const takeOverSession = useMutation(api.playground.takeOverSession);
  const updateCourseSettings = useMutation(api.course.updateCourseSettings);
  const updateConvexDocs = useMutation(api.course.updateConvexDocs);
  const updateSession = useMutation(api.course.updateSession);
  const addMessage = useMutation(api.course.addMessage);
  const generateResponse = useAction(api.course.generateResponse);

  // Bulk operations
  const bulkArchiveSessions = useMutation(api.playground.bulkArchiveSessions);
  const bulkDeleteSessions = useMutation(api.playground.bulkDeleteSessions);
  const bulkClearMessages = useMutation(api.playground.bulkClearSessionMessages);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedSession?.messages]);

  // Sync course settings with form data
  useEffect(() => {
    if (courseSettings && courseSettings.length > 0) {
      const newFormData = { ...settingsFormData };
      courseSettings.forEach((setting) => {
        if (setting.courseType in newFormData) {
          const courseType = setting.courseType as keyof typeof newFormData;
          newFormData[courseType] = {
            totalQuestions: setting.totalQuestions,
            maxScore: setting.maxScore,
          };
        }
      });
      setSettingsFormData(newFormData);
    }
  }, [courseSettings]);

  const handleSendAdminMessage = async () => {
    if (!adminMessage.trim() || !selectedSessionId || isLoading) return;

    setIsLoading(true);
    try {
      // Always insert hints, no editing AI messages
      await insertContextualMessage({
        sessionId: selectedSessionId,
        content: adminMessage,
        adminNote: adminNote || undefined,
        targetContext: targetContext,
      });
      setAdminMessage("");
      setAdminNote("");
    } catch (error) {
      console.error("Error sending admin message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setMessageToDelete(messageId);
    setShowDeleteModal(true);
  };

  const confirmDeleteMessage = async () => {
    if (!selectedSessionId || !messageToDelete) return;

    try {
      await deleteAnyMessage({
        sessionId: selectedSessionId,
        messageId: messageToDelete,
      });
    } catch (error) {
      console.error("Error deleting message:", error);
    } finally {
      setMessageToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const handlePauseSession = async (pause: boolean) => {
    if (!selectedSessionId) return;

    try {
      await takeOverSession({
        sessionId: selectedSessionId,
        takeover: pause,
      });
    } catch (error) {
      console.error("Error toggling session pause:", error);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!selectedSessionId || !editContent.trim()) return;

    try {
      // Only allow editing admin messages (hints), not AI messages
      const message = selectedSession?.messages.find((m) => m.messageId === messageId);

      if (message?.role === "assistant" && !message.isAdminIntervention) {
        throw new Error("Cannot edit AI messages");
      }

      // Use editMessage for admin messages only
      await editMessage({
        sessionId: selectedSessionId,
        messageId,
        newContent: editContent,
        adminNote: `Edited: ${new Date().toLocaleTimeString()}`,
      });

      setEditingMessageId(null);
      setEditContent("");
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  const handleProgressUpdate = async (type: string, value?: number) => {
    if (!selectedSessionId) return;

    try {
      switch (type) {
        case "score":
          await updateProgress({
            sessionId: selectedSessionId,
            scoreAdjustment: value || 10,
          });
          break;
        case "question":
          await updateProgress({
            sessionId: selectedSessionId,
            questionJump: value || (selectedSession?.currentQuestion || 0) + 1,
          });
          break;
        case "complete":
          await updateProgress({
            sessionId: selectedSessionId,
            markCompleted: true,
          });
          break;
      }
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const handleArchiveSession = async (sessionId: string, archive: boolean) => {
    try {
      await archiveSession({ sessionId, archive });
      // If we archived the currently selected session, clear selection
      if (archive && sessionId === selectedSessionId) {
        setSelectedSessionId(null);
      }
    } catch (error) {
      console.error("Error archiving session:", error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    setSessionToDelete(sessionId);
    setShowSessionDeleteModal(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      await deleteSession({ sessionId: sessionToDelete });
      // If we deleted the currently selected session, clear selection
      if (sessionToDelete === selectedSessionId) {
        setSelectedSessionId(null);
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    } finally {
      setSessionToDelete(null);
      setShowSessionDeleteModal(false);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getContextOptions = () => {
    if (!selectedSession) return [{ value: "current", label: "Current" }];

    const options = [{ value: "current", label: "Current" }];

    if (selectedSession.courseType === "build-apps-cards") {
      const totalCards = selectedSession.totalQuestions || 10;
      for (let i = 1; i <= totalCards; i++) {
        options.push({
          value: `card_${i}`,
          label: `Card ${i}`,
        });
      }
    } else {
      const totalQuestions = selectedSession.totalQuestions || 10;
      for (let i = 1; i <= totalQuestions; i++) {
        options.push({
          value: `question_${i}`,
          label: `Question ${i}`,
        });
      }
    }

    return options;
  };

  const getAdminMessagesForCurrentContext = () => {
    if (!selectedSession) return [];

    const currentContext =
      selectedSession.courseType === "build-apps-cards"
        ? `card ${selectedSession.currentQuestion + 1}`
        : `question ${selectedSession.currentQuestion + 1}`;

    return selectedSession.messages.filter((msg) => {
      if (!msg.isAdminIntervention) return false;
      const content = msg.content.toLowerCase();
      return (
        content.includes(currentContext) || content.includes("hint") || content.includes("guidance")
      );
    });
  };

  const handleOpenSettings = () => {
    setCurrentView("settings");
  };

  const handleSaveSettings = async () => {
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";

      console.log("💾 Saving course settings:", settingsFormData);

      for (const [courseType, settings] of Object.entries(settingsFormData)) {
        console.log(`📚 Processing courseType: ${courseType}`, settings);

        await updateCourseSettings({
          courseType,
          difficulty: "default", // Use default since we removed difficulty selection
          totalQuestions: settings.totalQuestions,
          maxScore: settings.maxScore,
          updatedBy: userEmail,
        });
      }

      console.log("✅ All course settings saved successfully");
      setCurrentView("playground");
      // Force refetch by toggling the modal
    } catch (error) {
      console.error("❌ Error saving settings:", error);
    }
  };

  const handleSettingsChange = (
    courseType: string,
    field: "totalQuestions" | "maxScore",
    value: number
  ) => {
    setSettingsFormData((prev) => {
      const newFormData = { ...prev };

      // Ensure the courseType exists in our form data
      if (courseType in newFormData) {
        newFormData[courseType as keyof typeof newFormData] = {
          ...newFormData[courseType as keyof typeof newFormData],
          [field]: value,
        };
      }

      console.log(`🔧 Settings changed: ${courseType} - ${field}: ${value}`, newFormData);
      return newFormData;
    });
  };

  // Function to handle saving Convex docs
  const handleSaveDocs = async (newDocsData: any) => {
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";

      for (const doc of newDocsData) {
        await updateConvexDocs({
          docType: doc.docType,
          url: doc.url,
          content: doc.content || "",
          isActive: doc.isActive,
          updatedBy: userEmail,
        });
      }
      setCurrentView("playground");
    } catch (error) {
      console.error("Error saving docs:", error);
    }
  };

  // Function to handle session intervention
  const handleSessionIntervention = async (sessionId: string, message: string) => {
    try {
      await addMessage({
        sessionId,
        role: "assistant",
        content: `[Admin Intervention] ${message}`,
      });
      await generateResponse({ sessionId, userMessage: "Admin intervention completed" });
    } catch (error) {
      console.error("Error sending intervention:", error);
    }
  };

  // Bulk operations handlers
  const handleSelectAllSessions = () => {
    const allSessionIds = new Set(allSessions.map((s) => s.sessionId));
    setSelectedSessions(allSessionIds);
  };

  const handleDeselectAllSessions = () => {
    setSelectedSessions(new Set());
  };

  const handleToggleSessionSelection = (sessionId: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionId)) {
      newSelected.delete(sessionId);
    } else {
      newSelected.add(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleBulkAction = (action: "archive" | "delete" | "clear") => {
    if (selectedSessions.size === 0) return;
    setBulkAction(action);
    setShowBulkActionsModal(true);
  };

  const confirmBulkAction = async () => {
    if (!bulkAction || selectedSessions.size === 0) return;

    const sessionIds = Array.from(selectedSessions);

    try {
      let result;
      switch (bulkAction) {
        case "archive":
          result = await bulkArchiveSessions({
            sessionIds,
            archive: !showArchived, // Archive if showing active, unarchive if showing archived
          });
          console.log(`Bulk archive result:`, result);
          break;
        case "delete":
          result = await bulkDeleteSessions({ sessionIds });
          console.log(`Bulk delete result:`, result);
          break;
        case "clear":
          result = await bulkClearMessages({ sessionIds });
          console.log(`Bulk clear result:`, result);
          break;
      }

      // Clear selections after operation
      setSelectedSessions(new Set());
    } catch (error) {
      console.error(`Error with bulk ${bulkAction}:`, error);
    } finally {
      setShowBulkActionsModal(false);
      setBulkAction(null);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row h-screen bg-gray-50">
      {/* Delete Message Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Message"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteMessage}
        isDestructive={true}>
        Are you sure you want to delete this message? This action cannot be undone.
      </Modal>

      {/* Delete Session Confirmation Modal */}
      <Modal
        isOpen={showSessionDeleteModal}
        onClose={() => setShowSessionDeleteModal(false)}
        title="Delete Session"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteSession}
        isDestructive={true}>
        Are you sure you want to permanently delete this session? This action cannot be undone.
      </Modal>

      {/* Bulk Actions Confirmation Modal */}
      <Modal
        isOpen={showBulkActionsModal}
        onClose={() => setShowBulkActionsModal(false)}
        title={`Bulk ${bulkAction === "archive" ? (showArchived ? "Unarchive" : "Archive") : bulkAction === "delete" ? "Delete" : "Clear"} Sessions`}
        confirmText={
          bulkAction === "archive"
            ? showArchived
              ? "Unarchive"
              : "Archive"
            : bulkAction === "delete"
              ? "Delete"
              : "Clear"
        }
        cancelText="Cancel"
        onConfirm={confirmBulkAction}
        isDestructive={bulkAction === "delete"}>
        Are you sure you want to{" "}
        {bulkAction === "archive"
          ? showArchived
            ? "unarchive"
            : "archive"
          : bulkAction === "delete"
            ? "permanently delete"
            : "clear all messages from"}{" "}
        {selectedSessions.size} selected session{selectedSessions.size !== 1 ? "s" : ""}?
        {bulkAction === "delete" && (
          <div className="mt-2 text-sm text-red-600">This action cannot be undone.</div>
        )}
        {bulkAction === "clear" && (
          <div className="mt-2 text-sm text-orange-600">
            This will reset all sessions to their initial state.
          </div>
        )}
      </Modal>

      {currentView === "settings" ? (
        <CourseSettingsPage
          settingsFormData={settingsFormData}
          setSettingsFormData={setSettingsFormData}
          onSave={handleSaveSettings}
          onCancel={() => setCurrentView("playground")}
          convexDocs={convexDocs}
          user={user}
          isClerkConfigured={isClerkConfigured}
          onSettingsChange={handleSettingsChange}
        />
      ) : currentView === "document-search" ? (
        <DocumentSearch onClose={() => setCurrentView("playground")} />
      ) : currentView === "stats" ? (
        <Stats />
      ) : (
        <>
          {/* Sidebar - Session List */}
          <div className="w-full sm:w-1/3 bg-white border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              {/* Breadcrumb */}
              <div className="mb-3">
                <a
                  href="/"
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-1 transition-colors">
                  <span>←</span>
                  <span>Back to App</span>
                </a>
              </div>

              {/* Title and Controls */}
              <div className="mb-4">
                <h1 className="text-lg font-semibold text-gray-900 mb-3">Admin Playground</h1>

                {/* Profile and Settings Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {isClerkConfigured && (
                      <UserButton
                        afterSignOutUrl="/admin-login"
                        appearance={{
                          elements: {
                            avatarBox: "w-7 h-7",
                          },
                        }}
                      />
                    )}
                    <button
                      onClick={handleOpenSettings}
                      className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors font-medium"
                      title="Configure course settings">
                      ⚙️ Settings
                    </button>
                    <button
                      onClick={() => setCurrentView("document-search")}
                      className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors font-medium"
                      title="Document Search">
                      🔍 Search
                    </button>
                    <a
                      href="/stats"
                      className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-200 transition-colors font-medium"
                      title="Learning Statistics">
                      📊 Stats
                    </a>
                  </div>
                </div>

                {/* Archive Toggle */}
                <div className="mb-4">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="rounded border-gray-300 w-4 h-4"
                    />
                    <span className="text-gray-700">
                      Show Archived ({adminStats?.archivedSessions || 0})
                    </span>
                  </label>
                </div>
              </div>

              {/* Stats */}
              {adminStats && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-semibold text-blue-800">{adminStats.activeSessions}</div>
                    <div className="text-blue-600">Active</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <div className="font-semibold text-green-800">
                      {adminStats.completedSessions}
                    </div>
                    <div className="text-green-600">Completed</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="font-semibold text-purple-800">
                      {adminStats.sessionsWithIntervention}
                    </div>
                    <div className="text-purple-600">Interventions</div>
                  </div>
                  <div className="bg-orange-50 p-2 rounded">
                    <div className="font-semibold text-orange-800">{adminStats.averageScore}</div>
                    <div className="text-orange-600">Avg Score</div>
                  </div>
                </div>
              )}

              {/* Bulk Actions */}
              <div className="mt-4 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedSessions.size > 0
                      ? `${selectedSessions.size} selected`
                      : "Bulk Actions"}
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleSelectAllSessions}
                      className="text-xs text-blue-600 hover:text-blue-800"
                      title="Select All">
                      All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={handleDeselectAllSessions}
                      className="text-xs text-gray-600 hover:text-gray-800"
                      title="Deselect All">
                      None
                    </button>
                  </div>
                </div>

                {selectedSessions.size > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => handleBulkAction("archive")}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                      title={
                        showArchived ? "Unarchive selected sessions" : "Archive selected sessions"
                      }>
                      {showArchived ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      onClick={() => handleBulkAction("clear")}
                      className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200"
                      title="Clear messages from selected sessions">
                      Clear
                    </button>
                    <button
                      onClick={() => handleBulkAction("delete")}
                      className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                      title="Delete selected sessions permanently">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {allSessions?.map((session) => (
                <div
                  key={session.sessionId}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedSessionId === session.sessionId ? "bg-blue-50 border-blue-200" : ""
                  }`}>
                  <div className="flex items-start space-x-3">
                    {/* Checkbox for bulk selection */}
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(session.sessionId)}
                      onChange={() => handleToggleSessionSelection(session.sessionId)}
                      className="mt-1 w-4 h-4 rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div
                      onClick={() => setSelectedSessionId(session.sessionId)}
                      className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {session.sessionId.slice(-8)}
                          {session.isArchived && (
                            <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                              ARCHIVED
                            </span>
                          )}
                        </span>
                        <div className="flex items-center space-x-1">
                          {session.hasAdminIntervention && (
                            <span
                              className="w-2 h-2 bg-blue-500 rounded-full"
                              title="Has admin interventions"
                            />
                          )}
                          {session.isTakenOver && (
                            <span
                              className="w-2 h-2 bg-red-500 rounded-full"
                              title="Admin takeover active"
                            />
                          )}
                          {session.isCompleted && (
                            <span className="w-2 h-2 bg-green-500 rounded-full" title="Completed" />
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 mb-1">
                        {session.courseType === "build-apps-cards"
                          ? `Cards Mode - Card ${session.currentQuestion + 1}/${session.totalQuestions || 10}`
                          : `Chat Mode - Q${session.currentQuestion + 1}/${session.totalQuestions || 10}`}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Score: {session.score}</span>
                        <span>{session.messageCount} msgs</span>
                        <span>{formatRelativeTime(session.lastActivity)}</span>
                      </div>
                    </div>

                    {/* Session Actions */}
                    <div className="flex flex-col space-y-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveSession(session.sessionId, !session.isArchived);
                        }}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          session.isArchived
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        title={session.isArchived ? "Unarchive" : "Archive"}>
                        {session.isArchived ? "📤" : "📥"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.sessionId);
                        }}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                        title="Delete permanently">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {selectedSession ? (
              <>
                {/* Session Header */}
                <div className="bg-white border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Session: {selectedSession.sessionId}
                      </h2>
                      <div className="text-sm text-gray-600 mt-1">
                        {selectedSession.courseType === "build-apps"
                          ? "Build Apps (Chat Mode)"
                          : "Build Apps (Cards Mode)"}
                        • {selectedSession.currentContext}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Progress Controls */}
                      <div className="flex items-center space-x-2">
                        {/* Pause/Resume button - only for chat mode */}
                        {selectedSession.courseType === "build-apps" && (
                          <button
                            onClick={() => handlePauseSession(!selectedSession.isTakenOver)}
                            className={`px-2 py-1 transition-colors text-xs font-medium ${
                              selectedSession.isTakenOver
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                            style={{ borderRadius: "15px" }}>
                            {selectedSession.isTakenOver ? "Resume AI" : "Pause AI"}
                          </button>
                        )}
                        <button
                          onClick={() => handleProgressUpdate("score", 10)}
                          className="px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-xs font-medium"
                          style={{ borderRadius: "15px" }}>
                          +10 Score
                        </button>
                        <button
                          onClick={() => handleProgressUpdate("question")}
                          className="px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-xs font-medium"
                          style={{ borderRadius: "15px" }}>
                          Next Q
                        </button>
                      </div>

                      {/* Score Display */}
                      <div className="text-right">
                        <p className="text-sm font-medium">Score: {selectedSession.score}</p>
                        <p className="text-xs text-gray-500">
                          {selectedSession.currentQuestion + 1}/
                          {selectedSession.totalQuestions || 10}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Session Paused Notice */}
                  {selectedSession.isTakenOver && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm font-medium text-red-800 mb-1">
                        🔴 AI Paused - Human in the Loop
                      </div>
                      <div className="text-xs text-red-600">
                        AI responses are disabled. Admin can manually respond or click "Resume AI"
                        to re-enable automatic responses.
                      </div>
                    </div>
                  )}

                  {/* Current Context Hints */}
                  {getAdminMessagesForCurrentContext().length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 mb-2">
                        💡 Active hints for {selectedSession.currentContext}:
                      </div>
                      <div className="space-y-2">
                        {getAdminMessagesForCurrentContext().map((hint, index) => (
                          <div
                            key={index}
                            className="text-sm text-blue-700 bg-white p-2 rounded border">
                            {hint.content.substring(0, 100)}...
                            {hint.adminNote && (
                              <span className="text-blue-500 text-xs ml-2">({hint.adminNote})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedSession.messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : message.isAdminIntervention
                              ? "bg-orange-100 border border-orange-200"
                              : "bg-gray-100"
                        }`}>
                        {/* Message Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium">
                              {message.role === "user"
                                ? "User"
                                : message.isAdminIntervention
                                  ? "Admin"
                                  : "AI"}
                            </span>
                            {message.isVoiceMessage && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                🎤 Voice
                              </span>
                            )}
                            {message.voiceCommand && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                🗣️ {message.voiceCommand}
                              </span>
                            )}
                            {message.adminNote && (
                              <span className="text-xs text-gray-500">({message.adminNote})</span>
                            )}
                          </div>

                          {/* Message Actions - For admin hints and AI responses */}
                          {(message.isAdminIntervention ||
                            (message.role === "assistant" && !message.isAdminIntervention)) && (
                            <div className="flex items-center space-x-1">
                              {message.isAdminIntervention && (
                                <button
                                  onClick={() => {
                                    setEditingMessageId(message.messageId || "");
                                    setEditContent(message.content);
                                  }}
                                  className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors font-medium"
                                  style={{ borderRadius: "12px" }}>
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteMessage(message.messageId || "")}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 hover:bg-red-200 transition-colors font-medium"
                                style={{ borderRadius: "12px" }}>
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Message Content */}
                        {editingMessageId === message.messageId ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full p-2 border rounded text-sm text-gray-900"
                              rows={3}
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEditMessage(message.messageId || "")}
                                className="px-3 py-1 bg-gray-900 text-white hover:bg-gray-800 transition-colors text-xs font-medium"
                                style={{ borderRadius: "15px" }}>
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditContent("");
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors text-xs font-medium"
                                style={{ borderRadius: "15px" }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm">
                            {message.role === "user" ? (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            ) : (
                              <MessageRenderer content={message.content} />
                            )}
                          </div>
                        )}

                        <div className="text-xs opacity-70 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Admin Input */}
                <div className="bg-white border-t border-gray-200 p-4">
                  <div className="space-y-3">
                    {/* Context Selection */}
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Target:</label>
                      <select
                        value={targetContext}
                        onChange={(e) => setTargetContext(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-sm">
                        {getContextOptions().map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Message Input */}
                    <div className="space-y-2">
                      <textarea
                        value={adminMessage}
                        onChange={(e) => setAdminMessage(e.target.value)}
                        placeholder={
                          selectedSession.courseType === "build-apps-cards"
                            ? `💡 Hint for ${getContextOptions().find((o) => o.value === targetContext)?.label}: Help the user understand...`
                            : `💡 Guidance for ${getContextOptions().find((o) => o.value === targetContext)?.label}: Provide additional context...`
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />

                      <input
                        type="text"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Optional admin note..."
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                      />
                    </div>

                    {/* Send Button */}
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Will insert hint for{" "}
                        {getContextOptions().find((o) => o.value === targetContext)?.label}
                      </div>
                      <button
                        onClick={handleSendAdminMessage}
                        disabled={!adminMessage.trim() || isLoading}
                        className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                        style={{ borderRadius: "30px" }}>
                        {isLoading ? "Sending..." : "Insert Hint"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <h3 className="text-lg font-medium mb-2">Select a Session</h3>
                  <p>Choose a session from the sidebar to monitor and intervene</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
