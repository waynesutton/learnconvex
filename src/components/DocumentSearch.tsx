import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface DocumentSearchProps {
  onClose: () => void;
}

export function DocumentSearch({ onClose }: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Query for search results
  const searchResults = useQuery(
    api.documentSearch.searchDocuments,
    searchQuery.trim() ? { query: searchQuery } : "skip"
  );

  // Query for all documents
  const allDocuments = useQuery(api.documentSearch.getAllDocuments) || [];

  // Mutations
  const uploadDocument = useMutation(api.documentSearch.uploadDocument);
  const deleteDocument = useMutation(api.documentSearch.deleteDocument);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const text = await selectedFile.text();
      await uploadDocument({
        title: selectedFile.name,
        content: text,
        type: selectedFile.type || "text/plain",
      });
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Error uploading document:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (documentId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      try {
        await deleteDocument({ documentId });
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the query reactively
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Document Search</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Upload Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Upload Document</h3>
            <div className="flex items-center space-x-3">
              <input
                id="file-input"
                type="file"
                accept=".txt,.md,.json,.csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm font-medium">
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>

          {/* Search Section */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex space-x-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-medium">
                Search
              </button>
            </form>
          </div>

          {/* Results Section */}
          <div className="space-y-4">
            {searchQuery.trim() ? (
              <>
                <h3 className="text-lg font-medium text-gray-900">
                  Search Results for "{searchQuery}"
                </h3>
                {searchResults === undefined ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map((result) => (
                      <div
                        key={result._id}
                        className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">{result.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              Score: {result.score?.toFixed(3)}
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {result.content.substring(0, 200)}...
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(result._id)}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete document">
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No documents found matching your search.
                  </p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900">
                  All Documents ({allDocuments.length})
                </h3>
                {allDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {allDocuments.map((doc) => (
                      <div key={doc._id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">{doc.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">
                              Type: {doc.type} | Uploaded:{" "}
                              {new Date(doc._creationTime).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-700 line-clamp-3">
                              {doc.content.substring(0, 200)}...
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(doc._id)}
                            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete document">
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No documents uploaded yet. Upload your first document above.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
