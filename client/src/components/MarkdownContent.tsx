import React, { ReactNode } from "react";
import { Streamdown, defaultRehypePlugins, defaultRemarkPlugins } from "streamdown";
import remarkMath from "remark-math";
// Formules ($…$ et $$…$$) : sans cette feuille de style, KaTeX affiche le rendu ET le source.
import "katex/dist/katex.min.css";

interface MarkdownContentProps {
  content: string;
  className?: string;
  /** Titre déjà affiché au-dessus : un « # Titre » identique en tête du texte est retiré. */
  title?: string;
}

// Streamdown applique KaTeX AVANT le nettoyage HTML : les classes de KaTeX sont alors
// supprimées et la formule s'affiche trois fois en texte brut. On nettoie d'abord.
const rehypePlugins = [
  defaultRehypePlugins.raw,
  defaultRehypePlugins.sanitize,
  defaultRehypePlugins.katex,
  defaultRehypePlugins.harden,
];
// $x$ en ligne en plus de $$…$$ : c'est ainsi que les étudiants écrivent leurs formules.
const remarkPlugins = [defaultRemarkPlugins.gfm, [remarkMath, { singleDollarTextMath: true }]];

function withoutRepeatedTitle(content: string, title?: string): string {
  if (!title) return content;
  const match = content.match(/^\s*#\s+(.+?)\s*#*\s*(\r?\n|$)/);
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return match && normalize(match[1]) === normalize(title) ? content.slice(match[0].length).replace(/^\s+/, "") : content;
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

export function MarkdownContent({ content, className = "", title }: MarkdownContentProps) {
  return (
    <Streamdown
      mode="static"
      shikiTheme={["vitesse-light", "vitesse-dark"]}
      className={`wiki-markdown ${className}`.trim()}
      // Les boutons copier/télécharger flottaient au-dessus des tableaux ; on garde ceux du code.
      controls={{ table: false, code: true, mermaid: false }}
      rehypePlugins={rehypePlugins}
      remarkPlugins={remarkPlugins as never}
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
      {withoutRepeatedTitle(content || "", title)}
    </Streamdown>
  );
}