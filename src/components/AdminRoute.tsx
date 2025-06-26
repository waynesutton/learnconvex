import { useUser } from "@clerk/clerk-react";
import { useConvexAuth } from "convex/react";
import { AdminLogin } from "./AdminLogin";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  // Check if Clerk is configured
  const isClerkConfigured = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!isClerkConfigured) {
    // For development without Clerk, allow access to playground
    console.warn("Clerk not configured - allowing admin access for development");
    return <>{children}</>;
  }

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

  // If not authenticated or not admin, show AdminLogin component
  if (!isAuthenticated || user?.publicMetadata?.role !== "admin") {
    return <AdminLogin />;
  }

  // User is authenticated and has admin role
  return <>{children}</>;
}
