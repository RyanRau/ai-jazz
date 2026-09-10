import { css } from "goober";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";
import Text from "../../text/Text/Text";
import Spinner from "../../feedback/Spinner/Spinner";

export type ChatBubbleStatus = "pending" | "streaming" | "complete" | "error";

export type ChatBubbleProps = {
  role: "user" | "assistant";
  content: string;
  /**
   * Defaults to `"complete"`. `"pending"`/`"streaming"` show a spinner and
   * "Generating…" below the content (and a placeholder "…" while `content`
   * is still empty); `"error"` shows "Generation failed" with no spinner.
   */
  status?: ChatBubbleStatus;
};

/**
 * One message in a chat thread. User bubbles are right-aligned and filled
 * with the accent color; assistant bubbles are left-aligned, bordered, on
 * `surface` — the same solid-vs-outlined distinction `Button`'s `solid`/
 * `outline` appearances draw elsewhere in the library.
 */
export default function ChatBubble({ role, content, status = "complete" }: ChatBubbleProps) {
  const theme = useTheme();
  const isUser = role === "user";
  const isGenerating = status === "pending" || status === "streaming";
  const isError = status === "error";
  const onAccentColor = isUser ? theme.colors.textOnAccent : undefined;

  return (
    <Flexbox justifyContent={isUser ? "flex-end" : "flex-start"}>
      <div
        className={css`
          max-width: 80%;
          border-radius: ${theme.radius.lg};
          padding: 10px 14px;
          background-color: ${isUser ? theme.colors.primary : theme.colors.surface};
          border: ${isUser ? "none" : `1px solid ${theme.colors.border}`};
        `}
      >
        <div
          className={css`
            white-space: pre-wrap;
            overflow-wrap: anywhere;
          `}
        >
          <Text variant="body" color={onAccentColor}>
            {content || (isGenerating ? "…" : "")}
          </Text>
        </div>
        {(isGenerating || isError) && (
          <Flexbox gap={4} alignItems="center" style={{ marginTop: 6 }}>
            {isGenerating && <Spinner size={12} color={onAccentColor} />}
            <Text
              variant="caption"
              color={isUser ? theme.colors.textOnAccent : theme.colors.textMuted}
            >
              {isError ? "Generation failed" : "Generating…"}
            </Text>
          </Flexbox>
        )}
      </div>
    </Flexbox>
  );
}
