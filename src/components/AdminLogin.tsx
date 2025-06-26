import { SignIn, useUser } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";

export function AdminLogin() {
  const { isLoading: authIsLoading, isAuthenticated } = useConvexAuth();
  const { user } = useUser();

  // Show loading state while auth is being determined
  if (authIsLoading) {
    return (
      <div className="min-h-screen bg-convex-cream flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show sign in form if not authenticated
  if (!isAuthenticated) {
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
          <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm max-w-md w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Access</h2>
              <p className="text-gray-600">Sign in to access the admin playground</p>
            </div>

            <SignIn
              routing="hash"
              signUpUrl="/admin-login"
              afterSignInUrl="/playground"
              appearance={{
                elements: {
                  formButtonPrimary: {
                    backgroundColor: "#1f2937",
                    "&:hover": {
                      backgroundColor: "#374151",
                    },
                  },
                  card: {
                    boxShadow: "none",
                    border: "none",
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-convex-cream px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-center text-sm text-gray-500">
            <a href="/" className="hover:text-convex-red transition-colors">
              ← Back to Learning
            </a>
          </div>
        </footer>
      </div>
    );
  }

  // Check if user has admin role - if already logged in and admin, redirect to playground
  const isAdmin = user?.publicMetadata?.role === "admin";

  // If user is already authenticated and has admin role, redirect to playground
  if (isAuthenticated && isAdmin) {
    window.location.href = "/playground";
    return null;
  }

  if (!isAdmin && isAuthenticated) {
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

        {/* Access Denied Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 sm:p-8 shadow-sm max-w-md w-full text-center">
            <div className="text-4xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have admin privileges to access this area.
            </p>
            <div className="space-y-3">
              <a
                href="/"
                className="block w-full px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors text-center"
                style={{ borderRadius: "30px" }}>
                Go to Learning
              </a>
              <button
                onClick={() => (window.location.href = "/")}
                className="block w-full px-4 py-2 bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors"
                style={{ borderRadius: "30px" }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-convex-cream px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-center text-sm text-gray-500">
            <a href="/" className="hover:text-convex-red transition-colors">
              ← Back to Learning
            </a>
          </div>
        </footer>
      </div>
    );
  }

  // If we get here, user is authenticated and has admin role
  // This component will be used in the route protection, so we just return null
  // The actual playground content will be rendered by the Playground component
  return null;
}
