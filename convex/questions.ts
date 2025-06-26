// Shared question banks for Convex learning courses

export interface Question {
  question: string;
  answer: string;
  explanation: string;
  topics: string[];
}

// Questions for "Build Apps" course - practical development
export const BUILD_APPS_QUESTIONS: Question[] = [
  {
    question: "What command creates a new Convex project?",
    answer: "npx create-convex@latest",
    explanation:
      "This command creates a new Convex project with all the necessary files and configuration.",
    topics: ["setup", "commands"],
  },
  {
    question: "What file defines your database schema?",
    answer: "convex/schema.ts",
    explanation:
      "The schema.ts file in the convex directory defines your database tables and their structure.",
    topics: ["schema", "files"],
  },
  {
    question: "What hook do you use to read data from Convex?",
    answer: "useQuery",
    explanation:
      "useQuery is the React hook used to read data from Convex. It provides real-time updates automatically.",
    topics: ["hooks", "queries"],
  },
  {
    question: "What hook do you use to write data to Convex?",
    answer: "useMutation",
    explanation:
      "useMutation is the React hook used to write data to Convex database through mutation functions.",
    topics: ["hooks", "mutations"],
  },
  {
    question: "What are the three types of Convex functions?",
    answer: "query, mutation, action",
    explanation:
      "Queries read data, mutations write data, and actions call external APIs or services.",
    topics: ["functions", "architecture"],
  },
  {
    question: "How do you start the Convex development server?",
    answer: "npx convex dev",
    explanation:
      "This command starts the Convex development server and watches for changes in your functions.",
    topics: ["development", "commands"],
  },
  {
    question: "What validator do you import for function arguments?",
    answer: "v",
    explanation:
      "Import { v } from 'convex/values' to use validators like v.string(), v.number(), etc.",
    topics: ["validation", "imports"],
  },
  {
    question: "How do you define a table in Convex schema?",
    answer: "defineTable",
    explanation: "Use defineTable() to create table definitions with field validators and indexes.",
    topics: ["schema", "tables"],
  },
  {
    question: "What's the purpose of indexes in Convex?",
    answer: "optimize query performance",
    explanation:
      "Indexes make queries faster by creating efficient lookup paths for your data fields.",
    topics: ["indexes", "performance"],
  },
  {
    question: "How do you deploy your Convex functions?",
    answer: "npx convex deploy",
    explanation:
      "This command deploys your functions to production and makes them available to your application.",
    topics: ["deployment", "commands"],
  },
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

// Function to get questions for a specific course - updated for build-apps only
export const getQuestionsForCourse = (courseType: string): Question[] => {
  switch (courseType) {
    case "build-apps":
    case "build-apps-cards":
      return BUILD_APPS_QUESTIONS;
    default:
      console.warn(`Unknown course type: ${courseType}, falling back to build-apps questions`);
      return BUILD_APPS_QUESTIONS;
  }
};

// Generate randomized question order indices
export function generateRandomizedQuestionOrder(totalQuestions: number): number[] {
  const indices = Array.from({ length: totalQuestions }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}
