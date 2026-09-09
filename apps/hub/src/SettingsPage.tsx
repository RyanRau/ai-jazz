import { useState } from "react";
import type { RecordModel } from "pocketbase";
import { ClientResponseError } from "pocketbase";
import {
  Avatar,
  AsyncButton,
  Card,
  Flexbox,
  Form,
  Header,
  SubmitButton,
  TextInput,
  useForm,
  useToast,
} from "bluestar";
import { pb } from "./pb";

type NameValues = { name: string };
type PasswordValues = { oldPassword: string; password: string; passwordConfirm: string };

export function SettingsPage({ record }: { record: RecordModel }) {
  const toast = useToast();

  const nameForm = useForm<NameValues>({
    initialValues: { name: record.name ?? "" },
    onSubmit: async (values) => {
      await pb.collection("users").update(record.id, { name: values.name });
      toast.success("Name updated");
    },
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarPreview = avatarFile
    ? URL.createObjectURL(avatarFile)
    : record.avatar
      ? pb.files.getURL(record, record.avatar)
      : undefined;

  async function uploadAvatar() {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append("avatar", avatarFile);
    await pb.collection("users").update(record.id, formData);
    setAvatarFile(null);
    toast.success("Avatar updated");
  }

  const passwordForm = useForm<PasswordValues>({
    initialValues: { oldPassword: "", password: "", passwordConfirm: "" },
    validate: (v) => ({
      oldPassword: v.oldPassword ? undefined : "Required",
      password: v.password ? undefined : "Required",
      passwordConfirm:
        v.passwordConfirm && v.passwordConfirm !== v.password ? "Passwords don't match" : undefined,
    }),
    onSubmit: async (values) => {
      try {
        await pb.collection("users").update(record.id, values);
      } catch (error) {
        // Surface PocketBase's per-field validation messages (e.g. a wrong
        // old password) onto the matching field instead of a generic banner.
        if (error instanceof ClientResponseError) {
          const fieldErrors = error.response["data"] as
            Record<string, { message?: string }> | undefined;
          let matched = false;
          for (const key of ["oldPassword", "password", "passwordConfirm"] as const) {
            const message = fieldErrors?.[key]?.message;
            if (message) {
              passwordForm.setError(key, message);
              matched = true;
            }
          }
          if (matched) return;
        }
        throw error;
      }
      // A successful password change invalidates the token that was used to
      // make this very request — PocketBase signs auth tokens with a secret
      // derived from the password hash, so every session (this tab and every
      // other *.ryanzrau.dev app sharing the auth cookie) is cut off until a
      // fresh token is issued. Re-authenticate immediately so the user stays
      // signed in rather than silently losing their session.
      await pb.collection("users").authWithPassword(record.email, values.password);
      passwordForm.reset();
      toast.success("Password updated");
    },
  });

  return (
    <Flexbox direction="column" gap={24}>
      <Card padding={24}>
        <Flexbox direction="column" gap={16}>
          <Header variant="h2">Profile</Header>

          <Flexbox direction="row" alignItems="center" gap={16}>
            <Avatar src={avatarPreview} name={record.name || record.email} size={64} />
            <Flexbox direction="column" gap={8}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
              <AsyncButton
                label="Upload avatar"
                density="dense"
                isDisabled={!avatarFile}
                onClick={uploadAvatar}
              />
            </Flexbox>
          </Flexbox>

          <Form form={nameForm} maxWidth={null}>
            <TextInput {...nameForm.field("name")} label="Name" />
            <SubmitButton label="Save name" />
          </Form>
        </Flexbox>
      </Card>

      <Card padding={24}>
        <Flexbox direction="column" gap={16}>
          <Header variant="h2">Change password</Header>
          <Form form={passwordForm} maxWidth={null}>
            <TextInput
              {...passwordForm.field("oldPassword")}
              label="Current password"
              type="password"
              required
            />
            <TextInput
              {...passwordForm.field("password")}
              label="New password"
              type="password"
              required
            />
            <TextInput
              {...passwordForm.field("passwordConfirm")}
              label="Confirm new password"
              type="password"
              required
            />
            <SubmitButton label="Update password" />
          </Form>
        </Flexbox>
      </Card>
    </Flexbox>
  );
}
