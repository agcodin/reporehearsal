"use client";

import { KeyboardEvent, useMemo, useRef } from "react";

const keywords = new Set(["as", "async", "await", "break", "case", "catch", "class", "const", "continue", "default", "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for", "from", "function", "if", "implements", "import", "in", "instanceof", "interface", "let", "new", "null", "of", "private", "protected", "public", "readonly", "return", "static", "super", "switch", "this", "throw", "true", "try", "type", "typeof", "undefined", "var", "void", "while", "with", "yield"]);
const tokenPattern = /(\/\/.*$|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b|=>|===?|!==?|&&|\|\||[{}()[\].,:;]|[+\-*/%<>]=?)/g;

function languageFor(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();
  const names: Record<string, string> = { ts: "TypeScript", tsx: "TypeScript React", js: "JavaScript", jsx: "JavaScript React", json: "JSON", sql: "SQL", css: "CSS", html: "HTML", yml: "YAML", yaml: "YAML", md: "Markdown", prisma: "Prisma" };
  if (path.toLowerCase().includes("dockerfile")) return "Dockerfile";
  return names[extension ?? ""] ?? "Plain Text";
}

function highlight(line: string, lineIndex: number) {
  const parts = line.split(tokenPattern).filter(part => part !== "");
  return <div className="source-line" key={lineIndex}><span className="source-line-number">{lineIndex + 1}</span><code>{parts.map((part, index) => {
    let className = "token-plain";
    if (part.startsWith("//") || part.startsWith("/*")) className = "token-comment";
    else if (/^["'`]/.test(part)) className = "token-string";
    else if (/^\d/.test(part)) className = "token-number";
    else if (keywords.has(part)) className = "token-keyword";
    else if (/^[A-Z][\w$]*$/.test(part)) className = "token-type";
    else if (/^(=>|===?|!==?|&&|\|\||[+\-*/%<>]=?)$/.test(part)) className = "token-operator";
    else if (/^[{}()[\].,:;]$/.test(part)) className = "token-punctuation";
    return <span className={className} key={`${lineIndex}-${index}`}>{part}</span>;
  })}{line.length === 0 ? " " : null}</code></div>;
}

export default function CodeEditor({ path, value, onChange, onSave }: { path: string; value: string; onChange: (value: string) => void; onSave: () => void }) {
  const backdrop = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const lines = useMemo(() => value.split("\n"), [value]);
  const language = languageFor(path);

  function syncScroll() { if (backdrop.current && textarea.current) { backdrop.current.scrollTop = textarea.current.scrollTop; backdrop.current.scrollLeft = textarea.current.scrollLeft; } }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); onSave(); return; }
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget; const start = target.selectionStart; const end = target.selectionEnd;
    onChange(`${value.slice(0, start)}  ${value.slice(end)}`);
    window.requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 2; });
  }

  return <div className="source-editor-shell">
    <div className="source-editor-main">
      <div className="source-highlight" ref={backdrop} aria-hidden>{lines.map(highlight)}</div>
      <textarea ref={textarea} className="source-input" aria-label={`Code editor for ${path}`} spellCheck={false} autoCapitalize="off" autoCorrect="off" value={value} onChange={event => onChange(event.target.value)} onScroll={syncScroll} onKeyDown={keyDown} />
    </div>
    <div className="source-statusbar"><span>Ln {lines.length}, Col 1</span><span>Spaces: 2</span><span>UTF-8</span><span>LF</span><b>{language}</b></div>
  </div>;
}
