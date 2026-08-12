import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "./ToastProvider";
import Button from "../../buttons/Button/Button";
import Flexbox from "../../layout/Flexbox/Flexbox";

const meta = {
  title: "Feedback/Toast",
  parameters: {
    docs: {
      description: {
        component:
          "Transient feedback after a mutation. Wrap the app in `ToastProvider` once, then call `useToast()` anywhere beneath it.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function Demo() {
  const toast = useToast();
  return (
    <Flexbox direction="row" gap={8} flexWrap="wrap">
      <Button label="Success" variant="creation" onClick={() => toast.success("Recipe saved")} />
      <Button
        label="Error"
        variant="destructive"
        onClick={() => toast.error("Couldn't reach the server")}
      />
      <Button label="Info" variant="secondary" onClick={() => toast.show("Sync started")} />
      <Button
        label="Sticky"
        onClick={() => toast.show("Stays until dismissed", { title: "Heads up", duration: 0 })}
      />
    </Flexbox>
  );
}

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: "Toasts auto-dismiss after 4s by default; `duration: 0` keeps one until dismissed.",
      },
    },
  },
};
