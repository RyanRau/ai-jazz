// Mirrors gateway.py's _parse_sse_json_lines -- splits on complete lines,
// JSON-parses `data: {...}` lines, carries a trailing partial line over to
// the next chunk. The gateway relays raw upstream bytes verbatim, so this
// has to handle the same partial-line-across-chunks case it does. Shared by
// useChat.ts (/v1/chat/send) and PlaygroundPage (/v1/chat/completions,
// streamed) -- both read the same OpenAI-style SSE shape from the gateway.
export function parseSseLines(buffer: string): {
  events: Record<string, unknown>[];
  leftover: string;
} {
  const lines = buffer.split("\n");
  const leftover = lines.pop() ?? "";
  const events: Record<string, unknown>[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "" || payload === "[DONE]") continue;
    try {
      events.push(JSON.parse(payload));
    } catch {
      // Partial/garbled line -- skip it, the stream keeps going.
    }
  }
  return { events, leftover };
}

/** The incremental text from one `choices[0].delta.content` chunk, if any. */
export function deltaContent(ev: Record<string, unknown>): string | null {
  const choices = ev.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const delta = (choices[0] as Record<string, unknown>)?.delta as
    Record<string, unknown> | undefined;
  return typeof delta?.content === "string" ? delta.content : null;
}

/** The `usage` object from an SSE chunk, if that chunk carries one. */
export function eventUsage(
  ev: Record<string, unknown>
): { prompt_tokens?: number; completion_tokens?: number } | null {
  const usage = ev.usage;
  return usage && typeof usage === "object" ? (usage as Record<string, number>) : null;
}
