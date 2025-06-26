# Better Auth Course - Product Requirements Document (PRD)

## Executive Summary

This PRD outlines the implementation of Better Auth authentication specifically for the `/playground` admin page while maintaining the existing Convex Auth system for the main application. This dual-authentication approach allows for granular admin access control without disrupting the current user experience.

## Current State Analysis

### Existing Authentication System

- **Framework**: @convex-dev/auth with Convex Auth
- **Providers**: Password and Anonymous authentication
- **Integration**: Fully integrated with Convex database and React components
- **User Experience**: Seamless sign-in/sign-out functionality
- **Database**: Uses authTables from @convex-dev/auth

### Current Playground Implementation

- **Location**: `/playground` route with React Router
- **Component**: Playground.tsx (588 lines)
- **Functionality**: Admin tools for course management
- **Access Control**: Currently none - publicly accessible
- **Features**: Course creation, question management, stats viewing

### Technical Stack

- **Frontend**: React with TypeScript, Vite
- **Backend**: Convex database and functions
- **Routing**: React Router v6
- **Styling**: Tailwind CSS with shadcn/ui components

## Problem Statement

The current `/playground` admin page lacks proper authentication and authorization controls. While the main application has a well-functioning auth system, we need to implement a separate admin authentication system that:

1. Provides secure access to admin functionality
2. Doesn't interfere with existing user authentication
3. Allows for role-based access control
4. Can be discovered but not accessed without proper credentials

## Requirements

### Functional Requirements

#### FR-1: Better Auth Implementation

- **Requirement**: Implement Better Auth framework for `/playground` page authentication
- **Details**:
  - Use Better Auth TypeScript framework
  - Implement username/password authentication only
  - Store authentication data separately from main app auth
  - Use Convex as the database adapter for Better Auth

#### FR-2: Admin Role Management

- **Requirement**: Implement admin role system in Convex database
- **Details**:
  - Create `admins` table in Convex schema
  - Store admin user credentials and metadata
  - Implement role-based access control
  - Support admin user creation and management

#### FR-3: Dual Authentication System

- **Requirement**: Maintain existing Convex Auth for main app while adding Better Auth for admin
- **Details**:
  - No changes to existing authentication flows
  - Separate authentication contexts
  - Independent session management
  - No cross-contamination between auth systems

#### FR-4: Access Control

- **Requirement**: Protect `/playground` route with authentication
- **Details**:
  - Redirect unauthenticated users to admin login
  - Verify admin role before granting access
  - Graceful handling of unauthorized access attempts
  - Session persistence and automatic logout

#### FR-5: Admin Login Interface

- **Requirement**: Create dedicated admin login page
- **Details**:
  - Clean, professional login form
  - Username and password fields
  - Error handling and validation
  - Responsive design consistent with app styling

### Non-Functional Requirements

#### NFR-1: Performance

- **Requirement**: Minimal impact on main application performance
- **Details**:
  - Lazy load Better Auth components
  - Separate bundle for admin authentication
  - Optimize database queries for admin operations

#### NFR-2: Security

- **Requirement**: Secure admin authentication implementation
- **Details**:
  - Password hashing and validation
  - Session management and timeout
  - Protection against common attacks (CSRF, XSS)
  - Secure credential storage

#### NFR-3: Maintainability

- **Requirement**: Clean, maintainable code architecture
- **Details**:
  - Separate admin auth logic from main app
  - Clear separation of concerns
  - Comprehensive error handling
  - Proper TypeScript typing

## Technical Approach

### Architecture Overview

```
Main App (Convex Auth)     Admin Section (Better Auth)
├── Existing auth flows    ├── Better Auth integration
├── User management       ├── Admin login page
├── Current UI/UX         ├── Role verification
└── Convex auth tables    └── Admin-specific tables
```

### Better Auth Integration Strategy

#### Option 1: Convex Better Auth Adapter (Recommended with Caveats)

- **Source**: convex-better-auth.netlify.app (official Convex team integration)
- **Status**: Early alpha development
- **Pros**:
  - Official Convex team support
  - Direct Convex integration
  - TypeScript support
- **Cons**:
  - Performance limitations (2x database calls)
  - Limited query capabilities
  - Alpha stability concerns
  - Requires separate HTTP endpoint hosting

#### Option 2: Custom Better Auth + Convex Integration

- **Approach**: Build custom adapter using Better Auth core
- **Pros**:
  - Full control over implementation
  - Optimized for specific use case
  - Better performance potential
- **Cons**:
  - Increased development time
  - Maintenance burden
  - Potential security concerns

#### Option 3: Hybrid Approach (Recommended)

- **Strategy**: Use Better Auth for authentication logic, custom Convex integration
- **Implementation**:
  - Better Auth handles password validation and session management
  - Custom Convex functions for admin role verification
  - Separate admin authentication context

### Database Schema Design

```typescript
// New admin-specific tables
export const adminSchema = {
  // Better Auth managed tables
  betterAuthUsers: defineTable({
    email: v.string(),
    username: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_username", ["username"]),

  betterAuthSessions: defineTable({
    userId: v.id("betterAuthUsers"),
    token: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  // Admin role management
  adminRoles: defineTable({
    userId: v.id("betterAuthUsers"),
    role: v.union(v.literal("admin"), v.literal("super_admin")),
    permissions: v.array(v.string()),
    createdAt: v.number(),
    createdBy: v.id("betterAuthUsers"),
  }).index("by_user", ["userId"]),
};
```

### Implementation Plan

#### Phase 1: Foundation Setup (Week 1)

1. **Research and Setup**

   - Install Better Auth dependencies
   - Set up Convex Better Auth adapter
   - Create admin database schema
   - Implement basic Better Auth configuration

2. **Database Migration**
   - Add admin tables to Convex schema
   - Create initial admin user via migration
   - Set up admin role system
   - Test database operations

#### Phase 2: Authentication Implementation (Week 2)

1. **Better Auth Integration**

   - Configure Better Auth with Convex adapter
   - Implement username/password provider
   - Set up session management
   - Create authentication utilities

2. **Admin Login Page**
   - Design admin login interface
   - Implement login form with validation
   - Add error handling and feedback
   - Style with existing design system

#### Phase 3: Access Control (Week 3)

1. **Route Protection**

   - Implement admin authentication guard
   - Protect `/playground` route
   - Add role-based access control
   - Handle unauthorized access

2. **Admin Context**
   - Create admin authentication context
   - Implement admin session management
   - Add logout functionality
   - Handle session persistence

#### Phase 4: Integration and Testing (Week 4)

1. **Integration Testing**

   - Test dual authentication systems
   - Verify no interference between auth systems
   - Test admin role permissions
   - End-to-end testing

2. **Performance Optimization**
   - Optimize admin authentication flows
   - Implement lazy loading
   - Monitor performance impact
   - Address any bottlenecks

### Detailed Implementation Steps

#### Step 1: Install Dependencies

```bash
npm install better-auth
npm install @better-auth/convex-adapter
```

#### Step 2: Configure Better Auth

```typescript
// convex/adminAuth.ts
import { BetterAuth } from "better-auth";
import { convexAdapter } from "@better-auth/convex-adapter";

export const adminAuth = new BetterAuth({
  database: convexAdapter(/* Convex configuration */),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
});
```

#### Step 3: Create Admin Login Component

```typescript
// src/components/AdminLogin.tsx
import { useState } from "react";
import { adminAuth } from "../lib/adminAuth";

export function AdminLogin() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAuth.signIn.email({
        email: credentials.username,
        password: credentials.password,
      });
    } catch (error) {
      // Handle login error
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <input
        type="text"
        placeholder="Username"
        value={credentials.username}
        onChange={(e) =>
          setCredentials(prev => ({ ...prev, username: e.target.value }))
        }
        className="w-full p-2 border rounded"
      />
      <input
        type="password"
        placeholder="Password"
        value={credentials.password}
        onChange={(e) =>
          setCredentials(prev => ({ ...prev, password: e.target.value }))
        }
        className="w-full p-2 border rounded"
      />
      <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">
        Sign In
      </button>
    </form>
  );
}
```

#### Step 4: Implement Route Protection

```typescript
// src/components/AdminRoute.tsx
import { useAdminAuth } from "../hooks/useAdminAuth";
import { AdminLogin } from "./AdminLogin";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAdminAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  // Check admin role
  if (!user?.role?.includes("admin")) {
    return <div>Access Denied</div>;
  }

  return <>{children}</>;
}
```

#### Step 5: Update Routing

```typescript
// src/AppRouter.tsx
import { AdminRoute } from "./components/AdminRoute";

function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Existing routes */}
        <Route path="/" element={<App />} />

        {/* Protected admin route */}
        <Route
          path="/playground"
          element={
            <AdminRoute>
              <Playground />
            </AdminRoute>
          }
        />
      </Routes>
    </Router>
  );
}
```

## Risk Assessment and Mitigation

### High Risks

#### Risk 1: Better Auth Convex Adapter Limitations

- **Impact**: Performance degradation, limited functionality
- **Probability**: High (documented alpha limitations)
- **Mitigation**:
  - Implement custom adapter if needed
  - Monitor performance closely
  - Have fallback plan to native Convex auth

#### Risk 2: Dual Authentication Complexity

- **Impact**: Increased maintenance burden, potential conflicts
- **Probability**: Medium
- **Mitigation**:
  - Clear separation of concerns
  - Comprehensive testing
  - Detailed documentation

#### Risk 3: Alpha Software Stability

- **Impact**: Unexpected breaking changes, bugs
- **Probability**: Medium (alpha software)
- **Mitigation**:
  - Pin specific versions
  - Thorough testing
  - Monitor Better Auth updates

### Medium Risks

#### Risk 4: Session Management Conflicts

- **Impact**: User experience issues, security concerns
- **Probability**: Low (separate contexts)
- **Mitigation**:
  - Use different cookie names/storage
  - Implement proper session isolation
  - Test cross-contamination scenarios

## Success Metrics

### Technical Metrics

- **Authentication Success Rate**: >99% successful admin logins
- **Performance Impact**: <100ms additional load time for main app
- **Security**: Zero auth-related vulnerabilities
- **Reliability**: <1% admin authentication failures

### User Experience Metrics

- **Admin Login Time**: <30 seconds from discovery to access
- **Main App Impact**: Zero user complaints about auth changes
- **Admin Satisfaction**: Positive feedback on admin experience

## Alternative Approaches Considered

### Alternative 1: Extend Existing Convex Auth

- **Approach**: Add admin roles to existing auth system
- **Pros**: Simpler implementation, single auth system
- **Cons**: Mixes user and admin concerns, potential security issues

### Alternative 2: Simple HTTP Basic Auth

- **Approach**: Use HTTP basic authentication for admin access
- **Pros**: Simple to implement, widely supported
- **Cons**: Poor user experience, limited functionality

### Alternative 3: Third-party Admin Service

- **Approach**: Use service like Auth0 or Firebase Auth for admin
- **Pros**: Managed service, robust features
- **Cons**: Additional cost, external dependency

## Conclusion and Recommendation

Based on the analysis, implementing Better Auth for the `/playground` admin page is technically feasible but comes with significant challenges due to the alpha state of the Convex adapter.

**Recommended Approach**: Hybrid implementation using Better Auth core with custom Convex integration, starting with the official adapter for rapid prototyping and migrating to custom implementation if performance issues arise.

**Timeline**: 4 weeks for full implementation with proper testing and optimization.

**Go/No-Go Decision Factors**:

- ✅ Technical feasibility confirmed
- ⚠️ Performance concerns need monitoring
- ✅ Security requirements can be met
- ⚠️ Maintenance burden is acceptable
- ✅ User experience can be preserved

**Final Recommendation**: Proceed with implementation using phased approach, with milestone reviews at each phase to assess viability and performance.
