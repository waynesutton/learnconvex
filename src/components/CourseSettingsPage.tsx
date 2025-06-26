import * as React from "react";
import { UserButton } from "@clerk/clerk-react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

type SettingsFormData = {
  "build-apps": { totalQuestions: number; maxScore: number };
  "build-apps-cards": { totalQuestions: number; maxScore: number };
};

interface ConvexDoc {
  _id: string;
  _creationTime: number;
  docType: string;
  url: string;
  content?: string;
  lastFetched: number;
  isActive: boolean;
  updatedBy?: string;
}

interface CourseSettingsPageProps {
  settingsFormData: SettingsFormData;
  setSettingsFormData: React.Dispatch<React.SetStateAction<SettingsFormData>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  convexDocs: ConvexDoc[];
  user: any;
  isClerkConfigured: boolean;
  onSettingsChange: (
    courseType: string,
    field: "totalQuestions" | "maxScore",
    value: number
  ) => void;
}

export function CourseSettingsPage({
  settingsFormData,
  setSettingsFormData,
  onSave,
  onCancel,
  convexDocs,
  user,
  isClerkConfigured,
  onSettingsChange,
}: CourseSettingsPageProps) {
  const [editingDocId, setEditingDocId] = React.useState<string | null>(null);
  const [editingDoc, setEditingDoc] = React.useState<Partial<ConvexDoc>>({});
  const [showAddDocForm, setShowAddDocForm] = React.useState(false);
  const [newDoc, setNewDoc] = React.useState<Partial<ConvexDoc>>({
    docType: "",
    url: "",
    isActive: true,
  });
  const [isRefreshing, setIsRefreshing] = React.useState<string | null>(null);

  // Mutations for managing docs
  const updateConvexDocs = useMutation(api.course.updateConvexDocs);
  const refreshDocContent = useMutation(api.course.refreshDocContent);
  const fetchAndUpdateDocContent = useAction(api.course.fetchAndUpdateDocContent);
  const deleteConvexDoc = useMutation(api.course.deleteConvexDoc);
  const initializeConvexDocs = useMutation(api.course.initializeConvexDocs);
  const initializeCourseSettings = useMutation(api.course.initializeCourseSettings);

  // Initialize default docs and course settings when component mounts
  React.useEffect(() => {
    const initializeDefaults = async () => {
      try {
        const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";

        // Initialize course settings
        await initializeCourseSettings({ updatedBy: userEmail });

        // Initialize docs if needed
        if (convexDocs.length === 0) {
          await initializeConvexDocs({ updatedBy: userEmail });
        }
      } catch (error) {
        console.error("Error initializing defaults:", error);
      }
    };

    initializeDefaults();
  }, [convexDocs.length, initializeConvexDocs, initializeCourseSettings, user]);

  const handleToggleActive = async (docType: string, isActive: boolean) => {
    try {
      const doc = convexDocs.find((d) => d.docType === docType);
      if (!doc) return;

      const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";
      await updateConvexDocs({
        docType,
        url: doc.url,
        content: doc.content,
        isActive,
        updatedBy: userEmail,
      });
    } catch (error) {
      console.error("Error toggling doc active status:", error);
    }
  };

  const handleEditDoc = (doc: ConvexDoc) => {
    setEditingDocId(doc._id);
    setEditingDoc({
      docType: doc.docType,
      url: doc.url,
      content: doc.content,
      isActive: doc.isActive,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingDoc.docType || !editingDoc.url) return;

    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";
      await updateConvexDocs({
        docType: editingDoc.docType,
        url: editingDoc.url,
        content: editingDoc.content,
        isActive: editingDoc.isActive ?? true,
        updatedBy: userEmail,
      });
      setEditingDocId(null);
      setEditingDoc({});
    } catch (error) {
      console.error("Error saving doc:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingDocId(null);
    setEditingDoc({});
  };

  const handleAddDoc = async () => {
    if (!newDoc.docType || !newDoc.url) return;

    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";
      await updateConvexDocs({
        docType: newDoc.docType,
        url: newDoc.url,
        content: "",
        isActive: newDoc.isActive ?? true,
        updatedBy: userEmail,
      });
      setNewDoc({ docType: "", url: "", isActive: true });
      setShowAddDocForm(false);
    } catch (error) {
      console.error("Error adding doc:", error);
    }
  };

  const handleRefreshDoc = async (docId: string, docType: string, url: string) => {
    setIsRefreshing(docId);
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";

      // Try to fetch and update content from the URL
      await fetchAndUpdateDocContent({
        docType,
        url,
        updatedBy: userEmail,
      });

      console.log(`Successfully refreshed content for ${docType}`);
    } catch (error) {
      console.error("Error refreshing doc:", error);

      // Fallback to just updating the timestamp if content fetch fails
      try {
        const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";
        await refreshDocContent({
          docType,
          url,
          updatedBy: userEmail,
        });
        console.log(`Updated timestamp for ${docType} (content fetch failed)`);
      } catch (fallbackError) {
        console.error("Fallback refresh also failed:", fallbackError);
      }
    } finally {
      setIsRefreshing(null);
    }
  };

  const handleDeleteDoc = async (docType: string) => {
    if (!confirm(`Are you sure you want to delete the ${docType} documentation link?`)) return;

    try {
      await deleteConvexDoc({ docType });
    } catch (error) {
      console.error("Error deleting doc:", error);
    }
  };

  const handleRefreshAll = async () => {
    if (!confirm("Refresh content for all active documentation links? This may take a moment."))
      return;

    const userEmail = user?.primaryEmailAddress?.emailAddress || "admin";
    const activeDocs = convexDocs.filter((doc) => doc.isActive);

    for (const doc of activeDocs) {
      setIsRefreshing(doc._id);
      try {
        await fetchAndUpdateDocContent({
          docType: doc.docType,
          url: doc.url,
          updatedBy: userEmail,
        });
        console.log(`Refreshed ${doc.docType}`);
      } catch (error) {
        console.error(`Failed to refresh ${doc.docType}:`, error);
        // Continue with other docs even if one fails
      }
    }
    setIsRefreshing(null);
  };

  return (
    <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure question counts and max scores for each course type and difficulty level
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              Admin:{" "}
              {isClerkConfigured
                ? user?.firstName || user?.emailAddresses[0]?.emailAddress
                : "Development Mode"}
            </span>
            {isClerkConfigured && <UserButton afterSignOutUrl="/admin-login" />}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-4xl">
        <div className="space-y-8">
          {/* Course Settings */}
          {Object.entries(settingsFormData).map(([courseType, settings]) => (
            <div key={courseType} className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {courseType === "build-apps" ? "Build Apps (Chat Mode)" : "Build Apps (Cards Mode)"}
              </h3>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Questions
                    </label>
                    <input
                      type="number"
                      value={settings.totalQuestions}
                      onChange={(e) =>
                        onSettingsChange(
                          courseType,
                          "totalQuestions",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Score
                    </label>
                    <input
                      type="number"
                      value={settings.maxScore}
                      onChange={(e) =>
                        onSettingsChange(courseType, "maxScore", parseInt(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="10"
                      max="1000"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Documentation Section */}
        <div className="mt-8 bg-gray-50 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Convex Documentation Links</h3>
            <div className="flex items-center space-x-3">
              {convexDocs.length > 0 && (
                <button
                  onClick={handleRefreshAll}
                  disabled={isRefreshing !== null}
                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium">
                  {isRefreshing ? "Refreshing..." : "🔄 Refresh All"}
                </button>
              )}
              <button
                onClick={() => setShowAddDocForm(true)}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium">
                + Add Documentation
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            These documentation links are used to provide accurate Convex information in AI
            responses. You can edit URLs, refresh content, and manage which docs are active.
          </p>

          {/* Add New Doc Form */}
          {showAddDocForm && (
            <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
              <h4 className="font-medium text-gray-900 mb-3">Add New Documentation Link</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <input
                    type="text"
                    value={newDoc.docType || ""}
                    onChange={(e) => setNewDoc({ ...newDoc, docType: e.target.value })}
                    placeholder="e.g., api-reference, tutorial"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                  <input
                    type="url"
                    value={newDoc.url || ""}
                    onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                    placeholder="https://docs.convex.dev/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center space-x-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newDoc.isActive ?? true}
                    onChange={(e) => setNewDoc({ ...newDoc, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
              <div className="mt-4 flex items-center space-x-3">
                <button
                  onClick={handleAddDoc}
                  disabled={!newDoc.docType || !newDoc.url}
                  className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium">
                  Add Documentation
                </button>
                <button
                  onClick={() => {
                    setShowAddDocForm(false);
                    setNewDoc({ docType: "", url: "", isActive: true });
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded-lg transition-colors text-sm font-medium">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Documentation List */}
          {convexDocs.length > 0 ? (
            <div className="space-y-3">
              {convexDocs.map((doc) => (
                <div key={doc._id} className="bg-white p-4 rounded-lg border border-gray-200">
                  {editingDocId === doc._id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Document Type
                        </label>
                        <input
                          type="text"
                          value={editingDoc.docType || ""}
                          onChange={(e) =>
                            setEditingDoc({ ...editingDoc, docType: e.target.value })
                          }
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                        <input
                          type="url"
                          value={editingDoc.url || ""}
                          onChange={(e) => setEditingDoc({ ...editingDoc, url: e.target.value })}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={editingDoc.isActive ?? true}
                          onChange={(e) =>
                            setEditingDoc({ ...editingDoc, isActive: e.target.checked })
                          }
                          className="rounded border-gray-300"
                        />
                        <label className="text-sm text-gray-700">Active</label>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors text-sm">
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 bg-gray-300 text-gray-700 hover:bg-gray-400 rounded transition-colors text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={doc.isActive}
                              onChange={(e) => handleToggleActive(doc.docType, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <h4 className="font-medium text-gray-900">
                              {doc.docType}
                              {(doc.docType === "home" || doc.docType === "llms") && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  Default
                                </span>
                              )}
                            </h4>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{doc.url}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Last updated: {new Date(doc.lastFetched).toLocaleString()}
                          {doc.updatedBy && ` by ${doc.updatedBy}`}
                        </p>
                        {doc.content && (
                          <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded">
                            Preview: {doc.content.substring(0, 100)}...
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRefreshDoc(doc._id, doc.docType, doc.url)}
                          disabled={isRefreshing === doc._id}
                          className="p-2 text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                          title="Refresh content">
                          {isRefreshing === doc._id ? "🔄" : "🔄"}
                        </button>
                        <button
                          onClick={() => handleEditDoc(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit">
                          ✏️
                        </button>
                        {doc.docType !== "home" && doc.docType !== "llms" && (
                          <button
                            onClick={() => handleDeleteDoc(doc.docType)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete">
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No documentation links configured.</p>
              <p className="text-sm mt-1">Add your first documentation link above.</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">Important Notes</h4>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Settings changes will only affect new sessions</li>
                  <li>Existing sessions will maintain their original configuration</li>
                  <li>Each difficulty level can have different question counts and scoring</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            ← Back to Playground
          </button>
          <button
            onClick={onSave}
            className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-medium">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
