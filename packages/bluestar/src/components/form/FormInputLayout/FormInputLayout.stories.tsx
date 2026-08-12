import type { Meta, StoryObj } from "@storybook/react";
import FormInputLayout from "./FormInputLayout";
import { controlClass } from "../controlStyles";
import { useTheme } from "../../../theme";
import Flexbox from "../../layout/Flexbox/Flexbox";

/**
 * A bare control, so each story shows the layout chrome rather than a
 * particular input. This is exactly what TextInput and friends do internally.
 */
function DemoControl({
  id,
  describedBy,
  invalid,
  warning,
}: {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  warning?: boolean;
}) {
  const theme = useTheme();
  return (
    <input
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      defaultValue=""
      placeholder="Click the label — focus should land here"
      className={controlClass(theme, { invalid, warning })}
    />
  );
}

const meta = {
  title: "Forms/FormInputLayout",
  component: FormInputLayout,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: [
          "The chrome every bluestar form control renders through: label, description,",
          "required marker, and the warning/error message beneath.",
          "",
          "`children` is a render prop rather than plain nodes because the layout owns",
          "the generated id. It hands back `{ id, describedBy, invalid }` so the control",
          "can wire `htmlFor`, `aria-describedby` and `aria-invalid` — which is why a",
          "label click focuses the input and a screen reader announces the message.",
          "",
          "Use this directly only when building a new control. For a field in an app,",
          "use `TextInput`, `NumberInput`, `Checkbox` and the rest, which pass these",
          "props straight through.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof FormInputLayout>;

export default meta;
type Story = StoryObj<typeof FormInputLayout>;

export const Default: Story = {
  render: () => (
    <FormInputLayout label="Recipe title">{(ids) => <DemoControl {...ids} />}</FormInputLayout>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <FormInputLayout label="Recipe title" description="Shown in the list view and used for search.">
      {(ids) => <DemoControl {...ids} />}
    </FormInputLayout>
  ),
};

export const Required: Story = {
  name: "Required marker",
  render: () => (
    <FormInputLayout label="Recipe title" required>
      {(ids) => <DemoControl {...ids} />}
    </FormInputLayout>
  ),
};

export const Warning: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Amber, advisory. The control is not marked `aria-invalid` — the value is usable, just worth a second look.",
      },
    },
  },
  render: () => (
    <FormInputLayout label="Servings" warning="That's a lot of servings.">
      {(ids) => <DemoControl {...ids} warning />}
    </FormInputLayout>
  ),
};

export const Error: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Red, and announced: the message carries `role="alert"` and the control gets `aria-invalid`. `useForm` routes validation failures here.',
      },
    },
  },
  render: () => (
    <FormInputLayout label="Recipe title" required error="Title is required">
      {(ids) => <DemoControl {...ids} />}
    </FormInputLayout>
  ),
};

export const ErrorBeatsWarning: Story = {
  name: "Error beats warning",
  parameters: {
    docs: {
      description: {
        story: "Both props set. Only the error renders — a validation failure outranks advice.",
      },
    },
  },
  render: () => (
    <FormInputLayout
      label="Recipe title"
      warning="This warning is suppressed"
      error="Title is required"
    >
      {(ids) => <DemoControl {...ids} />}
    </FormInputLayout>
  ),
};

export const Everything: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Every slot at once, plus the states side by side. Clicking any label should focus its own input — that is the `htmlFor` wiring working.",
      },
    },
  },
  render: () => (
    <Flexbox direction="column" gap={24}>
      <FormInputLayout
        label="Recipe title"
        description="Shown in the list view and used for search."
        required
        error="Title is required"
      >
        {(ids) => <DemoControl {...ids} />}
      </FormInputLayout>
      <FormInputLayout label="Servings" description="Per batch." warning="That's a lot.">
        {(ids) => <DemoControl {...ids} warning />}
      </FormInputLayout>
      <FormInputLayout label="Notes" description="Optional.">
        {(ids) => <DemoControl {...ids} />}
      </FormInputLayout>
    </Flexbox>
  ),
};
