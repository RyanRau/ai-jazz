import { Form, SubmitButton, TextInput, useForm } from "bluestar";
import { pb } from "./pb";

type LoginValues = { email: string; password: string };

/**
 * Kept in app code rather than bluestar: bluestar must not depend on the
 * `pocketbase` package (see packages/bluestar/AUDIT.md), so auth UI lives
 * here instead, built entirely from bluestar's form primitives.
 */
export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<LoginValues>({
    initialValues: { email: "", password: "" },
    validate: (v) => ({
      email: v.email ? undefined : "Required",
      password: v.password ? undefined : "Required",
    }),
    onSubmit: async (v) => {
      await pb.collection("users").authWithPassword(v.email, v.password);
      onSuccess?.();
    },
  });

  return (
    <Form form={form}>
      <TextInput
        {...form.field("email")}
        label="Email"
        type="email"
        autoComplete="username"
        required
      />
      <TextInput
        {...form.field("password")}
        label="Password"
        type="password"
        autoComplete="current-password"
        required
      />
      <SubmitButton label="Log in" />
    </Form>
  );
}
