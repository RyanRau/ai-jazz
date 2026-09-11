import { useState } from "react";
import type { ReactNode } from "react";
import { css } from "goober";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { useTheme } from "../../../theme";
import Icon from "../Icon/Icon";
import Link from "../../navigation/Link/Link";

export type MarkdownProps = {
  content: string;
};

// Recurses through React's rendered children to recover the plain text a
// node represents -- used for the code-block copy button, which needs the
// raw source, not the JSX react-markdown built out of it.
function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return nodeText(props?.children);
  }
  return "";
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const text = nodeText(children).replace(/\n$/, "");
  // `children` here is `InlineCode`'s rendered element (react-markdown calls
  // the `code` override regardless of whether it lands inside `pre`) --
  // its `className` is where remark put the fence's language, e.g.
  // "language-ts", alongside InlineCode's own goober class.
  const childClassName =
    children && typeof children === "object" && "props" in children
      ? ((children as { props?: { className?: string } }).props?.className ?? "")
      : "";
  const language = childClassName.match(/language-(\w+)/)?.[1];

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. an insecure context) -- nothing to
      // recover from, the button just silently does nothing.
    }
  }

  return (
    <div
      className={css`
        margin: 8px 0;
        border: 1px solid ${theme.colors.border};
        border-radius: ${theme.radius.md};
        overflow: hidden;
      `}
    >
      <div
        className={css`
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px;
          background-color: ${theme.colors.surface};
          border-bottom: 1px solid ${theme.colors.border};
        `}
      >
        <span
          className={css`
            font-family: ${theme.fonts.mono};
            font-size: 12px;
            color: ${theme.colors.textMuted};
          `}
        >
          {language ?? "text"}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className={css`
            display: flex;
            align-items: center;
            gap: 4px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: ${theme.radius.sm};
            color: ${theme.colors.textMuted};
            &:hover {
              background-color: ${theme.colors.surfaceHover};
              color: ${theme.colors.text};
            }
            &:focus-visible {
              outline: 2px solid ${theme.colors.focusRing};
              outline-offset: 2px;
            }
          `}
        >
          <Icon name={copied ? "check" : "copy"} size={14} />
          <span
            className={css`
              font-size: 12px;
            `}
          >
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </div>
      <pre
        className={css`
          margin: 0;
          padding: 12px;
          overflow-x: auto;
          background-color: ${theme.colors.background};
          font-family: ${theme.fonts.mono};
          font-size: 13px;
          line-height: 1.5;
          /* Neutralizes InlineCode's pill styling for the code element
             nested in here -- a block gets this wrapper's own chrome
             instead of looking like an inline snippet inside it. */
          & code {
            background: none;
            padding: 0;
            border-radius: 0;
            font-size: inherit;
          }
        `}
      >
        {children}
      </pre>
    </div>
  );
}

function InlineCode({ className, children }: { className?: string; children?: ReactNode }) {
  const theme = useTheme();
  return (
    <code
      className={
        css`
          font-family: ${theme.fonts.mono};
          font-size: 0.9em;
          background-color: ${theme.colors.surfaceHover};
          padding: 2px 5px;
          border-radius: ${theme.radius.sm};
        ` + (className ? ` ${className}` : "")
      }
    >
      {children}
    </code>
  );
}

/**
 * GitHub-flavored markdown rendered as themed elements -- for assistant
 * chat messages (see `ChatBubble`) and any other place an app needs to show
 * markdown (a docs page, a README preview). Renders straight to React
 * elements via `react-markdown` rather than `dangerouslySetInnerHTML`, so
 * there's no raw-HTML injection surface even for untrusted content (an
 * LLM's own output, here).
 *
 * A fenced code block gets its own bordered panel with a language label and
 * a copy button; inline code gets a small pill. Distinguishing the two
 * isn't done by inspecting the surrounding tree (react-markdown v9+ doesn't
 * expose that) -- `pre` and `code` are overridden independently, and the
 * code block's own `pre` wrapper resets the inline pill's styling for
 * whatever `code` element lands inside it via a `& code` rule, rather than
 * either override trying to detect the other's context.
 */
export default function Markdown({ content }: MarkdownProps) {
  const theme = useTheme();

  const components: Components = {
    pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
    code: ({ className, children }) => <InlineCode className={className}>{children}</InlineCode>,
    a: ({ href, children }) => (
      <Link href={href} external={href?.startsWith("http")} variant="primary">
        {children}
      </Link>
    ),
    h1: ({ children }) => (
      <h1
        className={css`
          font-size: ${theme.headings.h1.size};
          font-weight: ${theme.headings.h1.weight};
          margin: 20px 0 8px;
          &:first-child {
            margin-top: 0;
          }
        `}
      >
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className={css`
          font-size: ${theme.headings.h2.size};
          font-weight: ${theme.headings.h2.weight};
          margin: 18px 0 8px;
          &:first-child {
            margin-top: 0;
          }
        `}
      >
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className={css`
          font-size: ${theme.headings.h3.size};
          font-weight: ${theme.headings.h3.weight};
          margin: 16px 0 8px;
          &:first-child {
            margin-top: 0;
          }
        `}
      >
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className={css`
          font-size: 1em;
          font-weight: 600;
          margin: 14px 0 6px;
        `}
      >
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p
        className={css`
          margin: 0 0 10px;
          line-height: 1.6;
          &:last-child {
            margin-bottom: 0;
          }
        `}
      >
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul
        className={css`
          margin: 0 0 10px;
          padding-left: 22px;
          line-height: 1.6;
        `}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className={css`
          margin: 0 0 10px;
          padding-left: 22px;
          line-height: 1.6;
        `}
      >
        {children}
      </ol>
    ),
    li: ({ children }) => <li>{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        className={css`
          margin: 0 0 10px;
          padding: 4px 12px;
          border-left: 3px solid ${theme.colors.border};
          color: ${theme.colors.textMuted};
        `}
      >
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr
        className={css`
          border: none;
          border-top: 1px solid ${theme.colors.border};
          margin: 16px 0;
        `}
      />
    ),
    table: ({ children }) => (
      <div
        className={css`
          overflow-x: auto;
          margin: 0 0 10px;
        `}
      >
        <table
          className={css`
            border-collapse: collapse;
            width: 100%;
            font-size: 0.95em;
          `}
        >
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th
        className={css`
          text-align: left;
          padding: 6px 10px;
          border-bottom: 2px solid ${theme.colors.border};
          font-weight: 600;
        `}
      >
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className={css`
          text-align: left;
          padding: 6px 10px;
          border-bottom: 1px solid ${theme.colors.border};
        `}
      >
        {children}
      </td>
    ),
  };

  return (
    <div
      className={css`
        color: ${theme.colors.text};
        font-family: ${theme.fonts.body};
        word-break: break-word;
      `}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
