import { useState } from "react";
import { ClientResponseError } from "pocketbase";
import {
  Alert,
  EmptyState,
  Flexbox,
  Form,
  Header,
  SubmitButton,
  Text,
  TextInput,
  useForm,
} from "bluestar";
import { LoginForm } from "./LoginForm";
import { pb } from "./pb";

type ActivateValues = { name: string; password: string; passwordConfirm: string };

/**
 * Reached via the link a POST /api/custom/admin/invite response returns
 * (see apps/pocketbase/pb_hooks/admin.pb.js) -- an admin-created stub
 * account's first-time password + name setup. Rendered pre-auth, so this
 * has to work with no session at all.
 */
export function ActivatePage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const email = params.get("email");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);

  const alreadySignedInAs = pb.authStore.record?.email;
  const switchingAccounts =
    alreadySignedInAs && email && alreadySignedInAs.toLowerCase() !== email.toLowerCase();

  const form = useForm<ActivateValues>({
    initialValues: { name: "", password: "", passwordConfirm: "" },
    validate: (v) => ({
      password: v.password ? undefined : "Required",
      passwordConfirm:
        v.passwordConfirm && v.passwordConfirm !== v.password ? "Passwords don't match" : undefined,
    }),
    onSubmit: async (values) => {
      try {
        await pb
          .collection("users")
          .confirmPasswordReset(token!, values.password, values.passwordConfirm);
      } catch (error) {
        if (error instanceof ClientResponseError) {
          // PocketBase's real detail lives at data.token.message (e.g. "Invalid
          // or expired token.") -- the top-level message is a generic "An error
          // occurred while validating the submitted data." Same
          // error.response["data"] access SettingsPage.tsx already uses for
          // per-field errors. Fall back to the top-level message for anything
          // that isn't token-shaped, so a wrong URL or a CORS failure doesn't
          // masquerade as an expired link.
          const fieldErrors = error.response["data"] as
            Record<string, { message?: string }> | undefined;
          const tokenMessage = fieldErrors?.token?.message;
          setTokenError(
            tokenMessage
              ? "This invite link is invalid or has expired. Ask your admin to send a new one."
              : error.message
          );
          return;
        }
        throw error;
      }
      try {
        await pb.collection("users").authWithPassword(email!, values.password);
        if (values.name.trim()) {
          await pb
            .collection("users")
            .update(pb.authStore.record!.id, { name: values.name.trim() });
        }
        window.location.href = "/";
      } catch {
        // Password was set successfully even if this second call failed
        // (e.g. a stale `email` query param) -- don't present that as a
        // failed activation.
        setActivated(true);
      }
    },
  });

  if (!token || !email) {
    return (
      <EmptyState
        title="Invalid invite link"
        description="This link is missing what it needs to work. Ask your admin to send a new one."
      />
    );
  }

  if (activated) {
    return (
      <Flexbox direction="column" gap={16}>
        <Header variant="h2">Your account is active</Header>
        <Text variant="body">Sign in below to continue.</Text>
        <LoginForm onSuccess={() => (window.location.href = "/")} />
      </Flexbox>
    );
  }

  return (
    <Flexbox direction="column" gap={16}>
      <Header variant="h1">Activate your account</Header>
      <Text variant="body">Set a password (and a name, if you'd like) for {email}.</Text>
      {switchingAccounts && (
        <Alert variant="warning">
          You're currently signed in as {alreadySignedInAs} — continuing will switch you to {email}.
        </Alert>
      )}
      {tokenError && <Alert variant="error">{tokenError}</Alert>}
      <Form form={form} maxWidth={null}>
        <TextInput {...form.field("name")} label="Name" autoComplete="name" />
        <TextInput
          {...form.field("password")}
          label="Password"
          type="password"
          autoComplete="new-password"
          required
        />
        <TextInput
          {...form.field("passwordConfirm")}
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
        />
        <SubmitButton label="Activate" />
      </Form>
    </Flexbox>
  );
}
