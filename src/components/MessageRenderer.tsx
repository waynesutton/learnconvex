import React from "react";
import { CodeBlock } from "./CodeBlock";

interface MessageRendererProps {
  content: string;
}

interface ParsedPart {
  type: "text" | "code";
  content: string;
  key: string;
  language?: string;
}

// Function to render markdown text elements
const renderMarkdownText = (text: string): React.ReactNode => {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    // Handle headers
    if (line.startsWith("### ")) {
      return (
        <h3 key={index} className="text-lg font-bold mt-4 mb-2">
          {line.slice(4)}
        </h3>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h2 key={index} className="text-xl font-bold mt-4 mb-2">
          {line.slice(3)}
        </h2>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h1 key={index} className="text-2xl font-bold mt-4 mb-2">
          {line.slice(2)}
        </h1>
      );
    }

    // Handle bold text
    let processedLine = line;
    const boldRegex = /\*\*\*(.*?)\*\*\*/g;
    const boldMatches = [...line.matchAll(boldRegex)];

    if (boldMatches.length > 0) {
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;

      boldMatches.forEach((match, matchIndex) => {
        // Add text before bold
        if (match.index! > lastIndex) {
          parts.push(line.slice(lastIndex, match.index));
        }

        // Add bold text
        parts.push(<strong key={`bold-${index}-${matchIndex}`}>{match[1]}</strong>);

        lastIndex = match.index! + match[0].length;
      });

      // Add remaining text
      if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
      }

      return <div key={index}>{parts}</div>;
    }

    // Handle empty lines
    if (line.trim() === "") {
      return <br key={index} />;
    }

    // Regular text
    return <div key={index}>{line}</div>;
  });
};

export function MessageRenderer({ content }: MessageRendererProps) {
  // Parse code blocks from the content
  const parseContent = (text: string): ParsedPart[] => {
    const parts: ParsedPart[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index);
        if (textBefore.trim()) {
          parts.push({
            type: "text",
            content: textBefore,
            key: `text-${lastIndex}`,
          });
        }
      }

      // Add code block
      const language = match[1] || "text";
      const code = match[2].trim();
      parts.push({
        type: "code",
        language,
        content: code,
        key: `code-${match.index}`,
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText.trim()) {
        parts.push({
          type: "text",
          content: remainingText,
          key: `text-${lastIndex}`,
        });
      }
    }

    return parts.length > 0 ? parts : [{ type: "text", content: text, key: "text-0" }];
  };

  const parts = parseContent(content);

  return (
    <div>
      {parts.map((part) => {
        if (part.type === "code") {
          return (
            <CodeBlock
              key={part.key}
              code={part.content}
              language={part.language || "text"}
              showCopy={true}
            />
          );
        } else {
          return (
            <div key={part.key} className="whitespace-pre-wrap">
              {renderMarkdownText(part.content)}
            </div>
          );
        }
      })}
    </div>
  );
}
