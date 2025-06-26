import React, { useState } from "react";

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
  showCopy?: boolean;
}

export function CodeBlock({ code, language, title, showCopy = true }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting for TypeScript/JavaScript
  const highlightCode = (code: string, language: string) => {
    if (
      language !== "typescript" &&
      language !== "javascript" &&
      language !== "ts" &&
      language !== "js"
    ) {
      return code;
    }

    // Keywords
    const keywords = [
      "import",
      "export",
      "from",
      "const",
      "let",
      "var",
      "function",
      "async",
      "await",
      "if",
      "else",
      "for",
      "while",
      "return",
      "class",
      "interface",
      "type",
      "enum",
      "try",
      "catch",
      "finally",
      "throw",
      "new",
      "this",
      "super",
      "extends",
      "implements",
      "public",
      "private",
      "protected",
      "static",
      "readonly",
      "abstract",
      "namespace",
      "module",
      "declare",
      "as",
      "in",
      "of",
      "typeof",
      "instanceof",
      "void",
      "never",
      "any",
      "string",
      "number",
      "boolean",
      "object",
      "undefined",
      "null",
      "true",
      "false",
    ];

    let highlightedCode = code;

    // Highlight strings
    highlightedCode = highlightedCode.replace(
      /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
      '<span style="color: #98D982;">$1$2$1</span>'
    );

    // Highlight comments
    highlightedCode = highlightedCode.replace(
      /\/\/.*$/gm,
      '<span style="color: #7C7C7C;">$&</span>'
    );
    highlightedCode = highlightedCode.replace(
      /\/\*[\s\S]*?\*\//g,
      '<span style="color: #7C7C7C;">$&</span>'
    );

    // Highlight keywords
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g");
      highlightedCode = highlightedCode.replace(
        regex,
        `<span style="color: #FF7B72;">${keyword}</span>`
      );
    });

    // Highlight numbers
    highlightedCode = highlightedCode.replace(
      /\b\d+\.?\d*\b/g,
      '<span style="color: #79C0FF;">$&</span>'
    );

    // Highlight functions
    highlightedCode = highlightedCode.replace(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g,
      '<span style="color: #D2A8FF;">$1</span>'
    );

    return highlightedCode;
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-600">
      {title && (
        <div className="bg-gray-800 px-4 py-2 border-b border-gray-600 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-200">{title}</span>
          {showCopy && (
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors font-medium"
              style={{ borderRadius: "12px" }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>
      )}
      <div className="relative">
        <pre
          className="p-4 text-sm overflow-x-auto"
          style={{
            backgroundColor: "#0d1117",
            color: "#e6edf3",
            fontFamily:
              "ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace",
            margin: 0,
            lineHeight: "1.5",
          }}>
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{
              __html:
                language === "typescript" ||
                language === "javascript" ||
                language === "ts" ||
                language === "js"
                  ? highlightCode(code, language)
                  : code,
            }}
          />
        </pre>
        {showCopy && !title && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors font-medium"
            style={{ borderRadius: "12px" }}>
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
