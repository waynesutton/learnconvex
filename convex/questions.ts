// Shared question banks for Convex learning courses

export interface Question {
  question: string;
  answer: string;
  explanation: string;
  topics: string[];
}

// Questions for "How Convex Works" course - conceptual understanding
export const HOW_CONVEX_WORKS_QUESTIONS: Question[] = [
  {
    question: "What does 'reactive' mean in the context of Convex backend?",
    answer: "automatic updates when data changes",
    explanation: "Reactive means that when data changes on the server, your React components automatically re-render with the latest data - no manual refreshing needed!",
    topics: ["reactivity", "real-time"]
  },
  {
    question: "What are the three types of Convex functions?",
    answer: "query, mutation, action",
    explanation: "Queries read data, mutations write data, and actions call external APIs or services.",
    topics: ["functions", "architecture"]
  },
  {
    question: "Which function type provides real-time updates?",
    answer: "query",
    explanation: "Queries are live-updating subscriptions that automatically update your UI when data changes.",
    topics: ["queries", "real-time"]
  },
  {
    question: "What is the purpose of Convex mutations?",
    answer: "write data to the database",
    explanation: "Mutations are transactional functions that write data to the database and automatically trigger updates to relevant queries.",
    topics: ["mutations", "database"]
  },
  {
    question: "When would you use a Convex action instead of a mutation?",
    answer: "to call external APIs",
    explanation: "Actions are for calling external APIs, sending emails, or other non-database operations. They can't access the database directly.",
    topics: ["actions", "external-apis"]
  },
  {
    question: "What file defines your database structure in Convex?",
    answer: "convex/schema.ts",
    explanation: "The schema.ts file defines your database tables, their structure, and validation rules.",
    topics: ["schema", "database"]
  },
  {
    question: "Why are indexes important in Convex?",
    answer: "optimize query performance",
    explanation: "Indexes help queries run faster by creating efficient lookup paths for your data.",
    topics: ["indexes", "performance"]
  },
  {
    question: "What makes Convex queries different from traditional database queries?",
    answer: "they are live subscriptions",
    explanation: "Unlike traditional queries that run once, Convex queries are live subscriptions that automatically update when the underlying data changes.",
    topics: ["queries", "subscriptions"]
  },
  {
    question: "How does Convex handle data consistency?",
    answer: "automatic transactions",
    explanation: "Convex ensures data consistency through automatic transactions, so you don't have to worry about race conditions or partial updates.",
    topics: ["transactions", "consistency"]
  },
  {
    question: "What is the benefit of Convex's backend-as-a-service approach?",
    answer: "no server management needed",
    explanation: "Convex handles all the infrastructure, scaling, and maintenance so you can focus on building your application logic.",
    topics: ["backend-as-a-service", "infrastructure"]
  }
];

// Questions for "Build Apps" course - practical development
export const BUILD_APPS_QUESTIONS: Question[] = [
  {
    question: "What command creates a new Convex project?",
    answer: "npx create-convex@latest",
    explanation: "This command creates a new Convex project with all the necessary files and configuration.",
    topics: ["setup", "commands"]
  },
  {
    question: "What file defines your database schema?",
    answer: "convex/schema.ts",
    explanation: "The schema.ts file in the convex directory defines your database tables and their structure.",
    topics: ["schema", "files"]
  },
  {
    question: "What hook do you use to read data from Convex?",
    answer: "useQuery",
    explanation: "useQuery is the React hook used to read data from Convex. It provides real-time updates automatically.",
    topics: ["hooks", "queries"]
  },
  {
    question: "What hook do you use to write data to Convex?",
    answer: "useMutation",
    explanation: "useMutation is the React hook used to write data to Convex database through mutation functions.",
    topics: ["hooks", "mutations"]
  },
  {
    question: "What are the three types of Convex functions?",
    answer: "query, mutation, action",
    explanation: "Queries read data, mutations write data, and actions call external APIs or services.",
    topics: ["functions", "architecture"]
  },
  {
    question: "How do you start the Convex development server?",
    answer: "npx convex dev",
    explanation: "This command starts the Convex development server and watches for changes in your functions.",
    topics: ["development", "commands"]
  },
  {
    question: "What validator do you import for function arguments?",
    answer: "v",
    explanation: "Import { v } from 'convex/values' to use validators like v.string(), v.number(), etc.",
    topics: ["validation", "imports"]
  },
  {
    question: "How do you define a table in Convex schema?",
    answer: "defineTable",
    explanation: "Use defineTable() to create table definitions with field validators and indexes.",
    topics: ["schema", "tables"]
  },
  {
    question: "What's the purpose of indexes in Convex?",
    answer: "optimize query performance",
    explanation: "Indexes make queries faster by creating efficient lookup paths for your data fields.",
    topics: ["indexes", "performance"]
  },
  {
    question: "How do you deploy your Convex functions?",
    answer: "npx convex deploy",
    explanation: "This command deploys your functions to production and makes them available to your application.",
    topics: ["deployment", "commands"]
  }
];

// Utility function to shuffle questions randomly
export function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get questions for a specific course type
export function getQuestionsForCourse(courseType: string): Question[] {
  switch (courseType) {
    case "how-convex-works":
      return HOW_CONVEX_WORKS_QUESTIONS;
    case "build-apps":
    case "build-apps-cards":
      return BUILD_APPS_QUESTIONS;
    default:
      return BUILD_APPS_QUESTIONS;
  }
}

// Generate randomized question order indices
export function generateRandomizedQuestionOrder(totalQuestions: number): number[] {
  const indices = Array.from({ length: totalQuestions }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
} 