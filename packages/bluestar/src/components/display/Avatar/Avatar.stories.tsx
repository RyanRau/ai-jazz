import type { Meta, StoryObj } from "@storybook/react";
import Avatar from "./Avatar";
import Flexbox from "../../layout/Flexbox/Flexbox";

// A tiny inline SVG so the "with image" story renders without network access.
const SAMPLE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#6d5efc"/><circle cx="32" cy="24" r="12" fill="#fff"/><rect x="12" y="40" width="40" height="20" rx="10" fill="#fff"/></svg>'
  );

const meta = {
  title: "Display/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Circular identity marker. Shows an image if given one, otherwise falls back to initials in a deterministically-colored circle — including when the image URL is broken, not just when it's absent.",
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof Avatar>;

export const InitialsFallback: Story = {
  render: () => (
    <Flexbox direction="row" gap={12} alignItems="center">
      <Avatar name="Ryan Rau" />
      <Avatar name="alice@test.local" />
      <Avatar name="Bob Smith" />
      <Avatar name="carol@example.com" />
      <Avatar name="" />
    </Flexbox>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Flexbox direction="row" gap={12} alignItems="center">
      <Avatar name="Ryan Rau" src={SAMPLE_IMAGE} />
      <Avatar name="Ryan Rau" src="https://does-not-exist.invalid/broken.jpg" />
    </Flexbox>
  ),
  parameters: {
    docs: {
      description: {
        story: "The second avatar has a broken image URL and falls back to initials via onError.",
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <Flexbox direction="row" gap={12} alignItems="center">
      <Avatar name="Ryan Rau" size={24} />
      <Avatar name="Ryan Rau" size={36} />
      <Avatar name="Ryan Rau" size={48} />
      <Avatar name="Ryan Rau" size={64} />
    </Flexbox>
  ),
};
