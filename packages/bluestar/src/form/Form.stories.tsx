import type { Meta, StoryObj } from "@storybook/react";
import { useForm } from "./useForm";
import { Form } from "./Form";
import SubmitButton from "./SubmitButton";
import Button from "../components/buttons/Button/Button";
import TextInput from "../components/form/TextInput/TextInput";
import NumberInput from "../components/form/NumberInput/NumberInput";
import TextAreaInput from "../components/form/TextAreaInput/TextAreaInput";
import CheckboxList from "../components/form/CheckboxList/CheckboxList";
import Switch from "../components/form/Switch/Switch";
import Card from "../components/layout/Card/Card";
import Flexbox from "../components/layout/Flexbox/Flexbox";
import Text from "../components/text/Text/Text";

const meta = {
  title: "Forms/Form",
  parameters: {
    docs: {
      description: {
        component:
          "`useForm` holds the values, validation and submit state; `field(name)` spreads straight onto any bluestar input. The name is generic over the values object, so a typo is a compile error rather than an input that silently never updates.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const FullRoundTrip: Story = {
  render: () => {
    // One field of each value shape: string, number, boolean, string[].
    const form = useForm({
      initialValues: {
        title: "",
        servings: 4 as number | null,
        notes: "",
        tags: [] as string[],
        published: false,
      },
      validate: (values) => {
        const errors: Record<string, string> = {};
        if (!values.title.trim()) errors["title"] = "Title is required";
        if (values.servings !== null && values.servings < 1) {
          errors["servings"] = "Must serve at least one";
        }
        return errors;
      },
      onSubmit: async (values) => {
        await wait(1200);
        console.log("submitted", values);
      },
    });

    return (
      <Card padding={24}>
        <Form form={form}>
          <TextInput {...form.field("title")} label="Title" required />
          <NumberInput {...form.field("servings")} label="Servings" min={1} />
          <TextAreaInput {...form.field("notes")} label="Notes" rows={3} />
          <CheckboxList
            {...form.field("tags")}
            label="Tags"
            options={[
              { label: "Quick", value: "quick" },
              { label: "Vegetarian", value: "vegetarian" },
              { label: "Freezer-friendly", value: "freezer" },
            ]}
          />
          <Switch {...form.field("published")} label="Published" />

          <Flexbox direction="row" gap={8}>
            <SubmitButton label="Save" />
            <Button label="Reset" variant="secondary" onClick={() => form.reset()} />
          </Flexbox>

          <Text variant="caption">
            {`dirty: ${form.isDirty} · valid: ${form.isValid} · submitting: ${form.isSubmitting}`}
          </Text>
        </Form>
      </Card>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Submit with an empty title to see the inline error; fix it and the error clears. Saving waits 1.2s so the submit button's disabled + spinner state is visible. Reset restores the initial values.",
      },
    },
  },
};

export const ServerError: Story = {
  render: () => {
    const form = useForm({
      initialValues: { email: "" },
      onSubmit: async () => {
        await wait(600);
        throw new Error("That email is already registered");
      },
    });

    return (
      <Card padding={24}>
        <Form form={form}>
          <TextInput {...form.field("email")} label="Email" type="email" />
          <SubmitButton label="Sign up" />
        </Form>
      </Card>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "A rejected `onSubmit` surfaces as `submitError`, which `<Form>` renders as an Alert above the fields. Use `form.setError(name, message)` instead when the server blames a specific field.",
      },
    },
  },
};
