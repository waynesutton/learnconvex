export function NotFound() {
  return (
    <div className="min-h-screen bg-convex-cream flex flex-col">
      {/* Header */}
      <header className="bg-convex-cream px-4 py-3 pt-8">
        <div className="max-w-4xl mx-auto flex items-center justify-center">
          <a
            href="https://convex.dev?utm_source=learnconvexdemoapp"
            target="_blank"
            rel="noopener noreferrer">
            <img src="/convex-black.svg" alt="Convex" className="h-5" />
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm max-w-md w-full text-center">
          <div className="text-6xl mb-4">404</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="space-y-3">
            <a
              href="/"
              className="block w-full px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors text-center"
              style={{ borderRadius: "30px" }}>
              Go to Learning
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-convex-cream px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-center text-sm text-gray-500">
          <a
            href="https://convex.dev/?utm_source=learnconvexdemoapp"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-convex-red transition-colors">
            Powered by Convex
          </a>
        </div>
      </footer>
    </div>
  );
}
