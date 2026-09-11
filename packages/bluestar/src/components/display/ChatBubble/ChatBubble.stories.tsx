import type { Meta, StoryObj } from "@storybook/react";
import ChatBubble from "./ChatBubble";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Display/ChatBubble",
  component: ChatBubble,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "One message in a chat thread — user right-aligned and filled, assistant left-aligned and bordered.",
      },
    },
  },
} satisfies Meta<typeof ChatBubble>;

export default meta;
type Story = StoryObj<typeof ChatBubble>;

export const Thread: Story = {
  render: () => (
    <Flexbox direction="column" gap={12} style={{ width: 420 }}>
      <ChatBubble role="user" content="What's the fastest model on this gateway?" />
      <ChatBubble
        role="assistant"
        content="That depends on the task — for short completions, the 8B model is fastest."
      />
      <ChatBubble role="user" content="Give me a longer answer this time." />
      <ChatBubble role="assistant" content="" status="streaming" />
    </Flexbox>
  ),
};

export const Error: Story = {
  render: () => (
    <Flexbox direction="column" gap={12} style={{ width: 420 }}>
      <ChatBubble role="user" content="Summarize this document." />
      <ChatBubble role="assistant" content="" status="error" />
    </Flexbox>
  ),
};

export const WithMarkdown: Story = {
  render: () => (
    <Flexbox direction="column" gap={12} style={{ width: 480 }}>
      <ChatBubble
        role="user"
        content="Write a TS function that reverses a string, and explain the * and # in this sentence."
      />
      <ChatBubble
        role="assistant"
        content={
          "Here you go:\n\n```ts\nfunction reverse(s: string): string {\n  return [...s].reverse().join('');\n}\n```\n\nThe `*` and `#` are literal characters — I only treat *your* markdown-looking punctuation as text, not formatting."
        }
      />
    </Flexbox>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Assistant content renders through `Markdown` (code blocks included); the user's own message stays plain, whitespace-preserved text even though it also contains `*`/`#` characters.",
      },
    },
  },
};
