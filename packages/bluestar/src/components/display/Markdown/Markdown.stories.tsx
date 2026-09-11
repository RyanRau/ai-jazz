import type { Meta, StoryObj } from "@storybook/react";
import Markdown from "./Markdown";

const meta = {
  title: "Display/Markdown",
  component: Markdown,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "GitHub-flavored markdown rendered as themed React elements via `react-markdown` -- no `dangerouslySetInnerHTML`, so there's no raw-HTML injection surface even for untrusted content (an LLM's own output). A fenced code block gets a bordered panel with a language label and a copy button; inline code gets a small pill.",
      },
    },
  },
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof Markdown>;

const SAMPLE = `# Heading one

A paragraph with **bold**, *italic*, \`inline code\`, and a [link](https://example.com).

## Heading two

- One
- Two
  - Nested
- Three

1. First
2. Second

> A blockquote with some context.

\`\`\`ts
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

\`\`\`
no language on this one
still a block
\`\`\`

| Model | Vision |
| --- | --- |
| qwen3.5-9b | yes |
| llama-3-8b | no |

---

That's the whole tour.
`;

export const Default: Story = {
  args: { content: SAMPLE },
};

export const StreamingPartial: Story = {
  args: {
    content:
      "Here's a function that reverses a string:\n\n```js\nfunction reverse(s) {\n  return s.split('').reverse",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Partial/mid-stream markdown (an unclosed code fence) renders whatever it can parse rather than erroring -- the same content a live chat response looks like while it's still generating.",
      },
    },
  },
};
