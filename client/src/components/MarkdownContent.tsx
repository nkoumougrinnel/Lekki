import React, { ReactNode } from "react";
import { Streamdown } from "streamdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (React.isValidElement<{ children?: ReactNode }>(node)) {
    return nodeText(node.props.children);
  }
  return "";
}

export function markdownHeadingId(value: string): string {
  return `wiki-heading-${value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function headingProps(children: ReactNode, className?: string) {
  return {
    id: markdownHeadingId(nodeText(children)),
    className: `wiki-markdown-heading ${className || ""}`.trim(),
  };
}

function CodeBlock({ children, ...props }: React.ComponentProps<"pre">) {
  return (
    <pre {...props} className="wiki-code-content">
      {children}
    </pre>
  );
}

export function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
  return (
    <Streamdown
      mode="static"
      shikiTheme={["vitesse-light", "vitesse-dark"]}
      className={`wiki-markdown ${className}`.trim()}
      components={{
        h1: ({ children, className: headingClass, ...props }) => (
          <h1 {...props} {...headingProps(children, headingClass)}>{children}</h1>
        ),
        h2: ({ children, className: headingClass, ...props }) => (
          <h2 {...props} {...headingProps(children, headingClass)}>{children}</h2>
        ),
        h3: ({ children, className: headingClass, ...props }) => (
          <h3 {...props} {...headingProps(children, headingClass)}>{children}</h3>
        ),
        pre: CodeBlock,
      }}
    >
      {content || ""}
    </Streamdown>
  );
}